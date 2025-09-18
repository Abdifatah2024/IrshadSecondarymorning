import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Alias for transaction client
type Tx = Prisma.TransactionClient;

/** ---------- Decimal helpers (TYPE-SAFE) ---------- */
const D = (v: number | string | Prisma.Decimal | null | undefined): Prisma.Decimal =>
  v instanceof Prisma.Decimal ? v : new Prisma.Decimal(Number(v ?? 0) || 0);

/** typed reduce so TS keeps Prisma.Decimal, not a union */
const Dsum = (arr: Array<number | string | Prisma.Decimal>): Prisma.Decimal =>
  arr.reduce<Prisma.Decimal>((s, x) => s.plus(D(x)), new Prisma.Decimal(0));

/** Voucher number: VCH-YYYY-000001 */
async function generateVoucherNo(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const start = new Date(`${year}-01-01T00:00:00.000Z`);
  const end = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const count = await tx.familyPaymentVoucher.count({
    where: { createdAt: { gte: start, lt: end } },
  });
  return `VCH-${year}-${String(count + 1).padStart(6, "0")}`;
}

/** Optional discount rule (no-op by default) */
async function validateDiscountLimit(
  _tx: Tx,
  _userId: number,
  _month: number,
  _year: number,
  _sumDiscount: Prisma.Decimal
) {
  return true;
}

/**
 * POST /api/payments/family
 * body: { parentUserId, method, notes?, lines: [{studentId, amountPaid, discount?}], idempotencyKey? }
 */
export const createFamilyVoucher = async (req: Request, res: Response) => {
  const { parentUserId, method, notes, lines, idempotencyKey } = req.body as {
    parentUserId: number;
    method: string;
    notes?: string;
    lines: { studentId: number; amountPaid: number; discount?: number }[];
    idempotencyKey?: string;
  };

  // @ts-ignore – your auth sets req.user.useId
  const actor = req.user as { useId: number } | undefined;

  if (!actor?.useId) return res.status(401).json({ message: "Unauthorized" });
  if (!parentUserId || !Array.isArray(lines) || lines.length === 0) {
    return res.status(400).json({ message: "parentUserId and lines[] are required" });
  }

  try {
    const voucher = await prisma.$transaction(async (tx: Tx) => {
      // Idempotency via notes sentinel (simple approach)
      if (idempotencyKey) {
        const existed = await tx.familyPaymentVoucher.findFirst({
          where: { notes: `IDEMP:${idempotencyKey}` },
          include: {
            parentUser: true,
            createdBy: true,
            payments: {
              include: {
                student: { include: { classes: true } },
                allocations: { include: { studentFee: true } },
              },
            },
          },
        });
        if (existed) return existed;
      }

      // Parent must exist
      const parent = await tx.user.findUnique({ where: { id: Number(parentUserId) } });
      if (!parent) throw new Error("Parent not found");

      // Students must exist and (optionally) belong to parent
      const studentIds = [...new Set(lines.map(l => Number(l.studentId)))];
      const kids = await tx.student.findMany({
        where: { id: { in: studentIds }, isdeleted: false },
        select: { id: true, parentUserId: true },
      });
      if (kids.length !== studentIds.length) throw new Error("One or more students not found");
      if (kids.some(k => k.parentUserId !== Number(parentUserId))) {
        throw new Error("A student does not belong to this parent");
      }

      // Discount rule
      const now = new Date();
      const sumDiscount = Dsum(lines.map(l => l.discount ?? 0));
      await validateDiscountLimit(tx, actor.useId, now.getUTCMonth() + 1, now.getUTCFullYear(), sumDiscount);

      // Create voucher
      const voucherNo = await generateVoucherNo(tx);
      const baseNotes = idempotencyKey ? `IDEMP:${idempotencyKey}` : (notes ?? null);

      const createdVoucher = await tx.familyPaymentVoucher.create({
        data: {
          voucherNo,
          parentUserId: Number(parentUserId),
          method,
          notes: baseNotes,
          createdById: actor.useId,
        },
      });

      // For totals (computed later for response only)
      let totalPaid: Prisma.Decimal = new Prisma.Decimal(0);
      let totalDiscount: Prisma.Decimal = new Prisma.Decimal(0);

      // Create payments + allocate oldest fees + carry-forward remainder
      for (const line of lines) {
        const paid = D(line.amountPaid);
        const disc = D(line.discount ?? 0);
        totalPaid = totalPaid.plus(paid);
        totalDiscount = totalDiscount.plus(disc);

        const payment = await tx.payment.create({
          data: {
            studentId: Number(line.studentId),
            userId: actor.useId,
            amountPaid: paid,
            discount: disc,
            Description: notes || "Family voucher",
            familyVoucherId: createdVoucher.id,
          },
        });

        let remaining: Prisma.Decimal = paid.minus(disc);
        if (remaining.lte(0)) continue;

        const unpaidFees = await tx.studentFee.findMany({
          where: { studentId: Number(line.studentId), isPaid: false },
          orderBy: [{ year: "asc" }, { month: "asc" }, { id: "asc" }],
          select: {
            id: true,
            student_fee: true,
            PaymentAllocation: { select: { amount: true } },
          },
        });

        for (const fee of unpaidFees) {
          if (remaining.lte(0)) break;

          const base = D(fee.student_fee || 0);
          const already = Dsum(fee.PaymentAllocation.map(a => a.amount));
          const due = base.minus(already);
          if (due.lte(0)) continue;

          const pay = remaining.gt(due) ? due : remaining;

          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              studentFeeId: fee.id,
              amount: pay,
              studentId: Number(line.studentId),
            },
          });

          remaining = remaining.minus(pay);

          if (already.plus(pay).gte(base) && base.gt(0)) {
            await tx.studentFee.update({ where: { id: fee.id }, data: { isPaid: true } });
          }
        }

        // carry-forward any remainder
        if (remaining.gt(0)) {
          const acct = await tx.studentAccount.findUnique({ where: { studentId: Number(line.studentId) } });
          if (!acct) {
            await tx.studentAccount.create({
              data: { studentId: Number(line.studentId), carryForward: remaining },
            });
          } else {
            const newCF: Prisma.Decimal = D(acct.carryForward).plus(remaining);
            await tx.studentAccount.update({
              where: { studentId: Number(line.studentId) },
              data: { carryForward: newCF },
            });
          }
        }
      }

      // Return enriched voucher (totals computed in-code, not stored)
      const enriched = await tx.familyPaymentVoucher.findUnique({
        where: { id: createdVoucher.id },
        include: {
          parentUser: { select: { id: true, fullName: true, phoneNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          payments: {
            include: {
              student: {
                select: { id: true, fullname: true, classId: true, classes: { select: { name: true } } },
              },
              allocations: {
                include: {
                  studentFee: {
                    select: { id: true, month: true, year: true, isPaid: true, student_fee: true },
                  },
                },
              },
            },
            orderBy: { id: "asc" },
          },
        },
      });

      // Attach computed totals for the response
      return {
        ...enriched!,
        _totals: {
          totalPaid: totalPaid.toNumber(),
          totalDiscount: totalDiscount.toNumber(),
        },
      };
    });

    return res.status(201).json({ message: "Family voucher created", voucher });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ message: err?.message || "Failed to create family voucher" });
  }
};

/**
 * GET /api/payments/family
 * Query: page?, pageSize?, parentUserId?, parentPhone?, method?, from?, to?, q?
 */
export const listFamilyVouchers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize || 20)));
  const { parentUserId, parentPhone, method, from, to, q } = req.query as any;

  const where: Prisma.FamilyPaymentVoucherWhereInput = {};

  if (parentUserId) where.parentUserId = Number(parentUserId);
  if (method) where.method = String(method);

  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as any).gte = new Date(String(from));
    if (to) (where.createdAt as any).lte = new Date(String(to));
  }

  if (q) {
    where.OR = [
      { voucherNo: { contains: String(q), mode: "insensitive" } },
      { notes: { contains: String(q), mode: "insensitive" } },
      { parentUser: { is: { fullName: { contains: String(q), mode: "insensitive" } } } },
    ];
  }

  if (parentPhone) {
    where.parentUser = { is: { phoneNumber: String(parentPhone) } };
  }

  try {
    const [total, rows] = await prisma.$transaction([
      prisma.familyPaymentVoucher.count({ where }),
      prisma.familyPaymentVoucher.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          parentUser: { select: { id: true, fullName: true, phoneNumber: true } },
          createdBy: { select: { id: true, fullName: true } },
          payments: {
            select: {
              id: true,
              amountPaid: true,
              discount: true,
              student: { select: { id: true, fullname: true, classes: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    const items = rows.map((v) => {
      const paid = Dsum(v.payments.map((p) => p.amountPaid));
      const disc = Dsum(v.payments.map((p) => p.discount));
      return {
        id: v.id,
        voucherNo: v.voucherNo,
        method: v.method,
        notes: v.notes,
        createdAt: v.createdAt,
        parentUser: v.parentUser,
        createdBy: v.createdBy,
        studentCount: v.payments.length,
        studentsPreview: v.payments.slice(0, 3).map((p) => p.student.fullname),
        totalPaid: paid.toNumber(),
        totalDiscount: disc.toNumber(),
      };
    });

    res.json({ page, pageSize, total, items });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to list vouchers" });
  }
};

/** GET /api/payments/family/:voucherNo */
export const getFamilyVoucherByNo = async (req: Request, res: Response) => {
  const voucherNo = String(req.params.voucherNo);
  try {
    const voucher = await prisma.familyPaymentVoucher.findUnique({
      where: { voucherNo },
      include: {
        parentUser: { select: { id: true, fullName: true, phoneNumber: true } },
        createdBy: { select: { id: true, fullName: true } },
        payments: {
          include: {
            student: {
              select: {
                id: true,
                fullname: true,
                classId: true,
                classes: { select: { name: true } },
              },
            },
            allocations: {
              include: {
                studentFee: {
                  select: { id: true, month: true, year: true, isPaid: true, student_fee: true },
                },
              },
            },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    const totalPaid = Dsum(voucher.payments.map(p => p.amountPaid)).toNumber();
    const totalDiscount = Dsum(voucher.payments.map(p => p.discount)).toNumber();

    res.json({ ...voucher, _totals: { totalPaid, totalDiscount } });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch voucher" });
  }
};

/** GET /api/payments/family/parent/:parentUserId */
export const listFamilyVouchersByParent = async (req: Request, res: Response) => {
  const parentUserId = Number(req.params.parentUserId);
  if (!Number.isFinite(parentUserId)) return res.status(400).json({ message: "Invalid parentUserId" });

  try {
    const vouchers = await prisma.familyPaymentVoucher.findMany({
      where: { parentUserId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        voucherNo: true,
        method: true,
        notes: true,
        createdAt: true,
        payments: { select: { id: true, amountPaid: true, discount: true } },
      },
    });

    const items = vouchers.map((v) => ({
      ...v,
      totalPaid: Dsum(v.payments.map((p) => p.amountPaid)).toNumber(),
      totalDiscount: Dsum(v.payments.map((p) => p.discount)).toNumber(),
      count: v.payments.length,
    }));

    res.json({ parentUserId, count: items.length, vouchers: items });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: "Failed to list parent vouchers" });
  }
};

/**
 * DELETE /api/payments/family/:voucherNo
 * Soft-void: reverse allocations, adjust carry-forward remainders, delete payments, keep voucher (annotate notes)
 */
export const voidFamilyVoucher = async (req: Request, res: Response) => {
  const voucherNo = String(req.params.voucherNo);
  // @ts-ignore
  const actor = req.user as { useId: number } | undefined;
  if (!actor?.useId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const result = await prisma.$transaction(async (tx: Tx) => {
      const voucher = await tx.familyPaymentVoucher.findUnique({
        where: { voucherNo },
        include: {
          payments: { include: { allocations: true } },
        },
      });
      if (!voucher) throw new Error("Voucher not found");

      for (const p of voucher.payments) {
        // reverse allocations
        if (p.allocations.length) {
          const feeIds = [...new Set(p.allocations.map(a => a.studentFeeId))];

          // delete allocations
          await tx.paymentAllocation.deleteMany({ where: { paymentId: p.id } });

          // recompute isPaid for affected fees
          for (const feeId of feeIds) {
            const fee = await tx.studentFee.findUnique({
              where: { id: feeId },
              select: {
                student_fee: true,
                PaymentAllocation: { select: { amount: true } },
              },
            });
            const base = D(fee?.student_fee || 0);
            const allocated = Dsum(fee?.PaymentAllocation.map(x => x.amount) || []);
            const fully = base.gt(0) && allocated.gte(base);
            await tx.studentFee.update({ where: { id: feeId }, data: { isPaid: fully } });
          }
        }

        // adjust carry forward by remainder = amountPaid - discount - allocationsSum
        const allocSum = Dsum(p.allocations.map(a => a.amount));
        const remainder = D(p.amountPaid).minus(D(p.discount)).minus(allocSum);
        if (remainder.gt(0)) {
          const acct = await tx.studentAccount.findUnique({ where: { studentId: p.studentId } });
          if (acct) {
            const newCF: Prisma.Decimal = D(acct.carryForward).minus(remainder);
            // clamp at 0
            const clamp = newCF.gte(0) ? newCF : new Prisma.Decimal(0);
            await tx.studentAccount.update({ where: { studentId: p.studentId }, data: { carryForward: clamp } });
          }
        }

        // delete payment
        await tx.payment.delete({ where: { id: p.id } });
      }

      // annotate voucher as voided (keep row)
      const updated = await tx.familyPaymentVoucher.update({
        where: { id: voucher.id },
        data: { notes: `[VOIDED by ${actor.useId} at ${new Date().toISOString()}] ${voucher.notes ?? ""}` },
      });

      return updated;
    });

    res.json({ message: "Voucher voided", voucher: result });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ message: err?.message || "Failed to void voucher" });
  }
};


// export const listFamilyGroupsByParent = async (req: Request, res: Response) => {
//   const {
//     from,
//     to,
//     q,
//     parentUserId: parentUserIdStr,
//     studentId: studentIdStr,
//   } = req.query as {
//     from?: string;
//     to?: string;
//     q?: string;
//     parentUserId?: string;
//     studentId?: string;
//   };

//   // Build base where for Payment
//   const where: Prisma.PaymentWhereInput = {};

//   // Date window
//   if (from || to) {
//     where.date = {};
//     if (from) (where.date as { gte?: Date }).gte = new Date(from);
//     if (to) (where.date as { lte?: Date }).lte = new Date(to);
//   }

//   // If studentId provided, resolve their parent/family and show ALL siblings
//   if (studentIdStr) {
//     const sid = Number(studentIdStr);
//     if (!Number.isFinite(sid)) {
//       return res.status(400).json({ message: "Invalid studentId" });
//     }
//     const student = await prisma.student.findUnique({
//       where: { id: sid },
//       select: { parentUserId: true },
//     });
//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }
//     if (student.parentUserId) {
//       where.student = { is: { parentUserId: student.parentUserId } };
//     } else {
//       where.studentId = sid;
//     }
//   } else if (parentUserIdStr) {
//     const pid = Number(parentUserIdStr);
//     if (!Number.isFinite(pid)) {
//       return res.status(400).json({ message: "Invalid parentUserId" });
//     }
//     where.student = { is: { parentUserId: pid } };
//   }

//   try {
//     const payments = await prisma.payment.findMany({
//       where,
//       orderBy: { date: "desc" },
//       include: {
//         student: {
//           select: {
//             id: true,
//             fullname: true,
//             classId: true,
//             classes: { select: { name: true } },
//             parentUserId: true,
//             parentUser: {
//               select: { id: true, fullName: true, phoneNumber: true },
//             },
//           },
//         },
//         familyVoucher: { select: { voucherNo: true } }, // may be null
//         allocations: {
//           select: {
//             amount: true,
//             studentFee: { select: { id: true, month: true, year: true } },
//           },
//         },
//       },
//     });

//     // Optional client-side filter by parent name/phone
//     const filtered = q
//       ? payments.filter((p) => {
//           const name = p.student.parentUser?.fullName?.toLowerCase() || "";
//           const phone = p.student.parentUser?.phoneNumber || "";
//           const qq = q.toLowerCase();
//           return name.includes(qq) || phone.includes(q);
//         })
//       : payments;

//     type MonthlyKey = `${number}-${number}`;
//     type StudentMonthlySummary = Record<
//       MonthlyKey,
//       { year: number; month: number; applied: number }
//     >;

//     type StudentView = {
//       id: number;
//       fullname: string;
//       className: string | null;
//       totals: {
//         paid: number;
//         discount: number;
//         net: number;
//         applied: number;
//         remainder: number;
//       };
//       payments: Array<{
//         paymentId: number;
//         date: string;
//         voucherNo: string; // <- will be real voucherNo OR payment.id (as string)
//         amountPaid: number;
//         discount: number;
//         net: number;
//         applied: number;
//         remainder: number;
//         allocations: Array<{
//           studentFeeId: number;
//           month: number;
//           year: number;
//           applied: number;
//         }>;
//       }>;
//       monthlySummary: Array<{ year: number; month: number; applied: number }>;
//     };

//     type Group = {
//       parentUserId: number | null;
//       parentName: string | null;
//       parentPhone: string | null;
//       totals: {
//         totalPaid: Prisma.Decimal;
//         totalDiscount: Prisma.Decimal;
//         totalNet: Prisma.Decimal;
//         totalApplied: Prisma.Decimal;
//         totalRemainder: Prisma.Decimal;
//       };
//       paymentsCount: number;
//       voucherNos: string[]; // distinct list
//       period: { from?: string; to?: string };
//       studentsById: Map<number, StudentView>;
//     };

//     const byParent = new Map<number | 0, Group>();

//     for (const p of filtered) {
//       const pid = p.student.parentUserId ?? 0; // 0 bucket = no parent linked
//       if (!byParent.has(pid)) {
//         byParent.set(pid, {
//           parentUserId: p.student.parentUserId ?? null,
//           parentName: p.student.parentUser?.fullName ?? null,
//           parentPhone: p.student.parentUser?.phoneNumber ?? null,
//           totals: {
//             totalPaid: new Prisma.Decimal(0),
//             totalDiscount: new Prisma.Decimal(0),
//             totalNet: new Prisma.Decimal(0),
//             totalApplied: new Prisma.Decimal(0),
//             totalRemainder: new Prisma.Decimal(0),
//           },
//           paymentsCount: 0,
//           voucherNos: [],
//           period: {
//             from: from || undefined,
//             to: to || undefined,
//           },
//           studentsById: new Map<number, StudentView>(),
//         });
//       }

//       const g = byParent.get(pid)!;

//       const paid = D(p.amountPaid);
//       const disc = D(p.discount);
//       const net = paid.minus(disc);
//       const appliedSum = Dsum(p.allocations.map((a) => a.amount));
//       const remainder = net.minus(appliedSum);

//       // group totals
//       g.totals.totalPaid = g.totals.totalPaid.plus(paid);
//       g.totals.totalDiscount = g.totals.totalDiscount.plus(disc);
//       g.totals.totalNet = g.totals.totalNet.plus(net);
//       g.totals.totalApplied = g.totals.totalApplied.plus(appliedSum);
//       g.totals.totalRemainder = g.totals.totalRemainder.plus(remainder);
//       g.paymentsCount += 1;

//       // ----- voucher number fallback -----
//       // Use real voucherNo if exists, otherwise use the payment.id as the voucher number
//       const effectiveVoucherNo: string =
//         p.familyVoucher?.voucherNo ?? String(p.id);

//       // voucher list (unique)
//       if (!g.voucherNos.includes(effectiveVoucherNo)) {
//         g.voucherNos.push(effectiveVoucherNo);
//       }

//       // student bucket
//       if (!g.studentsById.has(p.student.id)) {
//         g.studentsById.set(p.student.id, {
//           id: p.student.id,
//           fullname: p.student.fullname,
//           className: p.student.classes?.name ?? null,
//           totals: { paid: 0, discount: 0, net: 0, applied: 0, remainder: 0 },
//           payments: [],
//           monthlySummary: [],
//         });
//       }
//       const s = g.studentsById.get(p.student.id)!;

//       // push payment row
//       const paymentRow = {
//         paymentId: p.id,
//         date: p.date.toISOString(),
//         voucherNo: effectiveVoucherNo, // <- here
//         amountPaid: paid.toNumber(),
//         discount: disc.toNumber(),
//         net: net.toNumber(),
//         applied: appliedSum.toNumber(),
//         remainder: remainder.toNumber(),
//         allocations: p.allocations.map((a) => ({
//           studentFeeId: a.studentFee.id,
//           month: a.studentFee.month,
//           year: a.studentFee.year,
//           applied: D(a.amount).toNumber(),
//         })),
//       };
//       s.payments.push(paymentRow);

//       // update per-student totals
//       s.totals.paid += paymentRow.amountPaid;
//       s.totals.discount += paymentRow.discount;
//       s.totals.net += paymentRow.net;
//       s.totals.applied += paymentRow.applied;
//       s.totals.remainder += paymentRow.remainder;

//       // monthly summary accumulation
//       const monthly: StudentMonthlySummary = {};
//       for (const a of paymentRow.allocations) {
//         const key = `${a.year}-${a.month}` as MonthlyKey;
//         if (!monthly[key]) {
//           monthly[key] = { year: a.year, month: a.month, applied: 0 };
//         }
//         monthly[key].applied += a.applied;
//       }

//       // merge monthly into s.monthlySummary
//       const existing = new Map<
//         MonthlyKey,
//         { year: number; month: number; applied: number }
//       >();
//       for (const row of s.monthlySummary) {
//         const key = `${row.year}-${row.month}` as MonthlyKey;
//         existing.set(key, row);
//       }
//       for (const [key, val] of Object.entries(monthly)) {
//         const k = key as MonthlyKey;
//         if (existing.has(k)) {
//           const cur = existing.get(k)!;
//           cur.applied += val.applied;
//         } else {
//           existing.set(k, {
//             year: (val as any).year,
//             month: (val as any).month,
//             applied: (val as any).applied,
//           });
//         }
//       }
//       s.monthlySummary = Array.from(existing.values()).sort((a, b) =>
//         a.year === b.year ? a.month - b.month : a.year - b.year
//       );
//     }

//     const items = Array.from(byParent.values()).map((g) => {
//       const students = Array.from(g.studentsById.values()).sort((a, b) =>
//         a.fullname.localeCompare(b.fullname)
//       );

//       return {
//         parentUserId: g.parentUserId,
//         parentName: g.parentName,
//         parentPhone: g.parentPhone,
//         totals: {
//           totalPaid: g.totals.totalPaid.toNumber(),
//           totalDiscount: g.totals.totalDiscount.toNumber(),
//           totalNet: g.totals.totalNet.toNumber(),
//           totalApplied: g.totals.totalApplied.toNumber(),
//           totalRemainder: g.totals.totalRemainder.toNumber(),
//         },
//         paymentsCount: g.paymentsCount,
//         studentCount: students.length,
//         voucherNos: g.voucherNos.sort(), // now includes payment IDs when no voucher
//         period: g.period,
//         students,
//       };
//     });

//     // Sort top families by totalPaid desc
//     items.sort((a, b) => b.totals.totalPaid - a.totals.totalPaid);

//     return res.json({ count: items.length, items });
//   } catch (err: any) {
//     console.error(err);
//     return res
//       .status(500)
//       .json({ message: "Failed to group families by parent" });
//   }
// };


/** month-key helpers (compare StudentFee.year/month to window) */
const monthKey = (y: number, m: number) => y * 12 + m; // m = 1..12
const monthKeyFromDate = (d: Date) => d.getUTCFullYear() * 12 + (d.getUTCMonth() + 1);

/** normalize day bounds */
const startOfDayUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
const endOfDayUTC = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));

export const listFamilyGroupsByParent = async (req: Request, res: Response) => {
  const {
    from,
    to,
    q,
    parentUserId: parentUserIdStr,
    studentId: studentIdStr,
  } = req.query as {
    from?: string;
    to?: string;
    q?: string;
    parentUserId?: string;
    studentId?: string;
  };

  // Build base where for Payment (this controls which "payments now" appear)
  const where: Prisma.PaymentWhereInput = {};

  // Window dates (inclusive)
  const fromDate = from ? startOfDayUTC(new Date(from)) : null;
  const toDate = to ? endOfDayUTC(new Date(to)) : endOfDayUTC(new Date());

  if (fromDate || toDate) {
    where.date = {};
    if (fromDate) (where.date as { gte?: Date }).gte = fromDate;
    if (toDate) (where.date as { lte?: Date }).lte = toDate;
  }

  // If studentId provided, resolve their parent/family and show ALL siblings
  if (studentIdStr) {
    const sid = Number(studentIdStr);
    if (!Number.isFinite(sid)) {
      return res.status(400).json({ message: "Invalid studentId" });
    }
    const student = await prisma.student.findUnique({
      where: { id: sid },
      select: { parentUserId: true },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    if (student.parentUserId) {
      where.student = { is: { parentUserId: student.parentUserId } };
    } else {
      where.studentId = sid;
    }
  } else if (parentUserIdStr) {
    const pid = Number(parentUserIdStr);
    if (!Number.isFinite(pid)) {
      return res.status(400).json({ message: "Invalid parentUserId" });
    }
    where.student = { is: { parentUserId: pid } };
  }

  try {
    // 1) Pull payments (these are the "paid now" rows in the window)
    const payments = await prisma.payment.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        student: {
          select: {
            id: true,
            fullname: true,
            classId: true,
            classes: { select: { name: true } },
            parentUserId: true,
            parentUser: {
              select: { id: true, fullName: true, phoneNumber: true },
            },
          },
        },
        familyVoucher: { select: { voucherNo: true } }, // may be null
        allocations: {
          select: {
            amount: true,
            studentFee: { select: { id: true, month: true, year: true } },
          },
        },
      },
    });

    // Optional client-side filter by parent name/phone
    const filtered = q
      ? payments.filter((p) => {
          const name = p.student.parentUser?.fullName?.toLowerCase() || "";
          const phone = p.student.parentUser?.phoneNumber || "";
          const qq = q.toLowerCase();
          return name.includes(qq) || phone.includes(q);
        })
      : payments;

    type MonthlyKey = `${number}-${number}`;
    type StudentMonthlySummary = Record<
      MonthlyKey,
      { year: number; month: number; applied: number }
    >;

    type StudentView = {
      id: number;
      fullname: string;
      className: string | null;
      totals: {
        paid: number;
        discount: number;
        net: number;      // sum of (amount - discount) in window
        applied: number;  // sum of allocations in window
        remainder: number;// net - applied in window
      };
      balances: {
        openingOutstanding: number;        // charges before 'from' - allocs before 'from'
        chargesInWindow: number;           // charges for months inside [from..to]
        paymentsNetInWindow: number;       // == totals.net
        allocatedInWindow: number;         // == totals.applied
        closingOutstanding: number;        // charges up to 'to' - allocs up to 'to'
        carryForwardCredit: number;        // StudentAccount.carryForward (current)
        closingAfterCredit: number;        // max(0, closingOutstanding - carryForwardCredit)
      };
      payments: Array<{
        paymentId: number;
        date: string;   // ISO
        voucherNo: string; // real voucherNo or fallback to payment.id
        amountPaid: number;
        discount: number;
        net: number;
        applied: number;
        remainder: number;
        allocations: Array<{
          studentFeeId: number;
          month: number;
          year: number;
          applied: number;
        }>;
      }>;
      monthlySummary: Array<{ year: number; month: number; applied: number }>;
    };

    type Group = {
      parentUserId: number | null;
      parentName: string | null;
      parentPhone: string | null;
      totals: {
        totalPaid: Prisma.Decimal;
        totalDiscount: Prisma.Decimal;
        totalNet: Prisma.Decimal;
        totalApplied: Prisma.Decimal;
        totalRemainder: Prisma.Decimal;

        openingOutstanding: Prisma.Decimal;
        chargesInWindow: Prisma.Decimal;
        paymentsNetInWindow: Prisma.Decimal;
        allocatedInWindow: Prisma.Decimal;
        closingOutstanding: Prisma.Decimal;
        carryForwardCredit: Prisma.Decimal;
        closingAfterCredit: Prisma.Decimal;
      };
      paymentsCount: number;
      voucherNos: string[]; // distinct list
      period: { from?: string; to?: string };
      studentsById: Map<number, StudentView>;
    };

    const byParent = new Map<number | 0, Group>();

    // 2) Build family → student → window payments structure first
    for (const p of filtered) {
      const pid = p.student.parentUserId ?? 0; // 0 bucket = no parent linked
      if (!byParent.has(pid)) {
        byParent.set(pid, {
          parentUserId: p.student.parentUserId ?? null,
          parentName: p.student.parentUser?.fullName ?? null,
          parentPhone: p.student.parentUser?.phoneNumber ?? null,
          totals: {
            totalPaid: new Prisma.Decimal(0),
            totalDiscount: new Prisma.Decimal(0),
            totalNet: new Prisma.Decimal(0),
            totalApplied: new Prisma.Decimal(0),
            totalRemainder: new Prisma.Decimal(0),

            openingOutstanding: new Prisma.Decimal(0),
            chargesInWindow: new Prisma.Decimal(0),
            paymentsNetInWindow: new Prisma.Decimal(0),
            allocatedInWindow: new Prisma.Decimal(0),
            closingOutstanding: new Prisma.Decimal(0),
            carryForwardCredit: new Prisma.Decimal(0),
            closingAfterCredit: new Prisma.Decimal(0),
          },
          paymentsCount: 0,
          voucherNos: [],
          period: {
            from: fromDate ? fromDate.toISOString().slice(0, 10) : undefined,
            to: toDate ? toDate.toISOString().slice(0, 10) : undefined,
          },
          studentsById: new Map<number, StudentView>(),
        });
      }

      const g = byParent.get(pid)!;

      const paid = D(p.amountPaid);
      const disc = D(p.discount);
      const net = paid.minus(disc);
      const appliedSum = Dsum(p.allocations.map((a) => a.amount));
      const remainder = net.minus(appliedSum);

      // group window totals (what happened now)
      g.totals.totalPaid = g.totals.totalPaid.plus(paid);
      g.totals.totalDiscount = g.totals.totalDiscount.plus(disc);
      g.totals.totalNet = g.totals.totalNet.plus(net);
      g.totals.totalApplied = g.totals.totalApplied.plus(appliedSum);
      g.totals.totalRemainder = g.totals.totalRemainder.plus(remainder);
      g.totals.paymentsNetInWindow = g.totals.paymentsNetInWindow.plus(net);
      g.totals.allocatedInWindow = g.totals.allocatedInWindow.plus(appliedSum);
      g.paymentsCount += 1;

      // voucher number (fallback to payment ID)
      const effectiveVoucherNo: string =
        p.familyVoucher?.voucherNo ?? String(p.id);
      if (!g.voucherNos.includes(effectiveVoucherNo)) {
        g.voucherNos.push(effectiveVoucherNo);
      }

      // student bucket
      if (!g.studentsById.has(p.student.id)) {
        g.studentsById.set(p.student.id, {
          id: p.student.id,
          fullname: p.student.fullname,
          className: p.student.classes?.name ?? null,
          totals: { paid: 0, discount: 0, net: 0, applied: 0, remainder: 0 },
          balances: {
            openingOutstanding: 0,
            chargesInWindow: 0,
            paymentsNetInWindow: 0,
            allocatedInWindow: 0,
            closingOutstanding: 0,
            carryForwardCredit: 0,
            closingAfterCredit: 0,
          },
          payments: [],
          monthlySummary: [],
        });
      }
      const s = g.studentsById.get(p.student.id)!;

      const paymentRow = {
        paymentId: p.id,
        date: p.date.toISOString(),
        voucherNo: effectiveVoucherNo,
        amountPaid: paid.toNumber(),
        discount: disc.toNumber(),
        net: net.toNumber(),
        applied: appliedSum.toNumber(),
        remainder: remainder.toNumber(),
        allocations: p.allocations.map((a) => ({
          studentFeeId: a.studentFee.id,
          month: a.studentFee.month,
          year: a.studentFee.year,
          applied: D(a.amount).toNumber(),
        })),
      };
      s.payments.push(paymentRow);

      // per-student window totals
      s.totals.paid += paymentRow.amountPaid;
      s.totals.discount += paymentRow.discount;
      s.totals.net += paymentRow.net;
      s.totals.applied += paymentRow.applied;
      s.totals.remainder += paymentRow.remainder;

      // monthly summary (applied amounts by month/year in the window)
      const monthly: StudentMonthlySummary = {};
      for (const a of paymentRow.allocations) {
        const key = `${a.year}-${a.month}` as MonthlyKey;
        if (!monthly[key]) {
          monthly[key] = { year: a.year, month: a.month, applied: 0 };
        }
        monthly[key].applied += a.applied;
      }
      const existing = new Map<
        MonthlyKey,
        { year: number; month: number; applied: number }
      >();
      for (const row of s.monthlySummary) {
        const key = `${row.year}-${row.month}` as MonthlyKey;
        existing.set(key, row);
      }
      for (const [key, val] of Object.entries(monthly)) {
        const k = key as MonthlyKey;
        if (existing.has(k)) {
          const cur = existing.get(k)!;
          cur.applied += (val as any).applied;
        } else {
          existing.set(k, {
            year: (val as any).year,
            month: (val as any).month,
            applied: (val as any).applied,
          });
        }
      }
      s.monthlySummary = Array.from(existing.values()).sort((a, b) =>
        a.year === b.year ? a.month - b.month : a.year - b.year
      );
    }

    // 3) Financial balances: opening/closing per student using StudentFee & PaymentAllocation(payment.date)
    // Collect all involved studentIds:
    const allStudentIds = Array.from(
      new Set(
        Array.from(byParent.values())
          .flatMap((g) => Array.from(g.studentsById.keys()))
      )
    );

    if (allStudentIds.length > 0) {
      const fees = await prisma.studentFee.findMany({
        where: { studentId: { in: allStudentIds } },
        select: {
          id: true,
          studentId: true,
          month: true,
          year: true,
          student_fee: true,
          PaymentAllocation: {
            select: {
              amount: true,
              payment: { select: { date: true } }, // needed to time-slice
            },
          },
        },
      });

      const accounts = await prisma.studentAccount.findMany({
        where: { studentId: { in: allStudentIds } },
        select: { studentId: true, carryForward: true },
      });
      const cfByStudent = new Map<number, Prisma.Decimal>();
      for (const a of accounts) cfByStudent.set(a.studentId, D(a.carryForward));

      const fromKey = fromDate ? monthKeyFromDate(fromDate) : null;
      const toKey = toDate ? monthKeyFromDate(toDate) : null;

      // Walk each family/student to compute balances
      for (const g of byParent.values()) {
        for (const s of g.studentsById.values()) {
          const sFees = fees.filter((f) => f.studentId === s.id);

          // Charges: sum student_fee by month buckets
          let chargesBeforeFrom = new Prisma.Decimal(0);
          let chargesTo = new Prisma.Decimal(0);
          let chargesInWindow = new Prisma.Decimal(0);

          for (const f of sFees) {
            const base = D(f.student_fee || 0);
            const key = monthKey(f.year, f.month);
            const withinFrom =
              fromKey === null ? true : key >= fromKey;
            const withinTo = toKey === null ? true : key <= toKey;

            if (fromKey !== null && key < fromKey) {
              chargesBeforeFrom = chargesBeforeFrom.plus(base);
            }
            if (toKey === null || key <= toKey) {
              chargesTo = chargesTo.plus(base);
            }
            if (withinFrom && withinTo) {
              chargesInWindow = chargesInWindow.plus(base);
            }
          }

          // Allocations: slice by payment.date
          let allocBeforeFrom = new Prisma.Decimal(0);
          let allocTo = new Prisma.Decimal(0);

          for (const f of sFees) {
            for (const a of f.PaymentAllocation) {
              const ad = a.payment.date; // JS Date
              if (fromDate && ad < fromDate) {
                allocBeforeFrom = allocBeforeFrom.plus(D(a.amount));
              }
              if (!toDate || ad <= toDate) {
                allocTo = allocTo.plus(D(a.amount));
              }
            }
          }

          const openingOutstanding = chargesBeforeFrom.minus(allocBeforeFrom);
          const closingOutstanding = chargesTo.minus(allocTo);
          const carryForwardCredit = cfByStudent.get(s.id) ?? new Prisma.Decimal(0);
          const closingAfterCredit = (() => {
            const val = closingOutstanding.minus(carryForwardCredit);
            return val.gte(0) ? val : new Prisma.Decimal(0);
          })();

          // Fill student balances
          s.balances = {
            openingOutstanding: openingOutstanding.toNumber(),
            chargesInWindow: chargesInWindow.toNumber(),
            paymentsNetInWindow: s.totals.net, // already computed from window payments
            allocatedInWindow: s.totals.applied,
            closingOutstanding: closingOutstanding.toNumber(),
            carryForwardCredit: carryForwardCredit.toNumber(),
            closingAfterCredit: closingAfterCredit.toNumber(),
          };

          // Roll up to family totals
          g.totals.openingOutstanding = g.totals.openingOutstanding.plus(
            openingOutstanding
          );
          g.totals.chargesInWindow = g.totals.chargesInWindow.plus(
            chargesInWindow
          );
          g.totals.closingOutstanding = g.totals.closingOutstanding.plus(
            closingOutstanding
          );
          g.totals.carryForwardCredit = g.totals.carryForwardCredit.plus(
            carryForwardCredit
          );
          g.totals.closingAfterCredit = g.totals.closingAfterCredit.plus(
            closingAfterCredit
          );
        }
      }
    }

    // 4) Shape response
    const items = Array.from(byParent.values()).map((g) => {
      const students = Array.from(g.studentsById.values()).sort((a, b) =>
        a.fullname.localeCompare(b.fullname)
      );

      return {
        parentUserId: g.parentUserId,
        parentName: g.parentName,
        parentPhone: g.parentPhone,
        totals: {
          // window (what happened now)
          totalPaid: g.totals.totalPaid.toNumber(),
          totalDiscount: g.totals.totalDiscount.toNumber(),
          totalNet: g.totals.totalNet.toNumber(), // "what he paid now (net)"
          totalApplied: g.totals.totalApplied.toNumber(),
          totalRemainder: g.totals.totalRemainder.toNumber(),

          // balances
          openingOutstanding: g.totals.openingOutstanding.toNumber(),
          chargesInWindow: g.totals.chargesInWindow.toNumber(),
          paymentsNetInWindow: g.totals.paymentsNetInWindow.toNumber(),
          allocatedInWindow: g.totals.allocatedInWindow.toNumber(),
          closingOutstanding: g.totals.closingOutstanding.toNumber(),
          carryForwardCredit: g.totals.carryForwardCredit.toNumber(),
          closingAfterCredit: g.totals.closingAfterCredit.toNumber(),
        },
        paymentsCount: g.paymentsCount,
        studentCount: students.length,
        voucherNos: g.voucherNos.sort(),
        period: g.period,
        students,
      };
    });

    // Sort top families by totalNet (what they paid now) desc
    items.sort((a, b) => b.totals.totalNet - a.totals.totalNet);

    return res.json({ count: items.length, items });
  } catch (err: any) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "Failed to group families by parent with balances" });
  }
};

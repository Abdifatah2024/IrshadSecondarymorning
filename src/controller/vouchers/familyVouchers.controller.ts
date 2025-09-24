// import { Prisma, PrismaClient } from "@prisma/client";
// import { Request, Response } from "express";

// const prisma = new PrismaClient();
// type Tx = Prisma.TransactionClient;

// // helper to coerce Prisma.Decimal -> number
// const n = (d: Prisma.Decimal | null | undefined) => Number(d ?? 0);

// // GET /api/family-vouchers?search=&from=&to=&page=1&pageSize=10&parentUserId=&createdById=
// export async function listFamilyVouchers(req: Request, res: Response) {
//   try {
//     const {
//       search = "",
//       from,
//       to,
//       page = "1",
//       pageSize = "10",
//       parentUserId,
//       createdById,
//       method,
//     } = req.query as Record<string, string>;

//     const p = Math.max(parseInt(page || "1", 10), 1);
//     const take = Math.max(parseInt(pageSize || "10", 10), 1);
//     const skip = (p - 1) * take;

//     const createdAtFilter: any = {};
//     if (from) createdAtFilter.gte = new Date(from);
//     if (to) createdAtFilter.lte = new Date(to);

//     const where: Prisma.FamilyPaymentVoucherWhereInput = {
//       AND: [
//         search
//           ? {
//               OR: [
//                 { voucherNo: { contains: search, mode: "insensitive" } },
//                 {
//                   parentUser: {
//                     fullName: { contains: search, mode: "insensitive" },
//                   },
//                 },
//                 {
//                   createdBy: {
//                     fullName: { contains: search, mode: "insensitive" },
//                   },
//                 },
//               ],
//             }
//           : {},
//         Object.keys(createdAtFilter).length
//           ? { createdAt: createdAtFilter }
//           : {},
//         parentUserId ? { parentUserId: Number(parentUserId) } : {},
//         createdById ? { createdById: Number(createdById) } : {},
//         method ? { method } : {},
//       ],
//     };

//     // total count for pagination
//     const total = await prisma.familyPaymentVoucher.count({ where });

//     // page of vouchers
//     const rows = await prisma.familyPaymentVoucher.findMany({
//       where,
//       orderBy: { createdAt: "desc" },
//       skip,
//       take,
//       include: {
//         parentUser: { select: { id: true, fullName: true, phone: true } },
//         createdBy: { select: { id: true, fullName: true } },
//       },
//     });

//     // compute sums per voucher using groupBy on Payment
//     const ids = rows.map((r) => r.id);
//     const grouped = ids.length
//       ? await prisma.payment.groupBy({
//           by: ["familyVoucherId"],
//           where: { familyVoucherId: { in: ids } },
//           _sum: { amountPaid: true, discount: true },
//           _count: { _all: true },
//         })
//       : [];

//     const sumsMap = new Map<
//       number,
//       { amount: number; discount: number; count: number }
//     >();
//     for (const g of grouped) {
//       sumsMap.set(g.familyVoucherId!, {
//         amount: n(g._sum.amountPaid),
//         discount: n(g._sum.discount),
//         count: g._count._all,
//       });
//     }

//     const data = rows.map((r) => ({
//       id: r.id,
//       voucherNo: r.voucherNo,
//       method: r.method,
//       notes: r.notes,
//       createdAt: r.createdAt,
//       parentUser: r.parentUser,
//       createdBy: r.createdBy,
//       totals: sumsMap.get(r.id) ?? { amount: 0, discount: 0, count: 0 },
//     }));

//     return res.json({
//       page: p,
//       pageSize: take,
//       total,
//       totalPages: Math.ceil(total / take),
//       data,
//     });
//   } catch (e: any) {
//     console.error(e);
//     return res.status(500).json({ message: "Server error", error: e?.message });
//   }
// }

// // GET /api/family-vouchers/:id
// export async function getFamilyVoucherById(req: Request, res: Response) {
//   try {
//     const id = Number(req.params.id);
//     const voucher = await prisma.familyPaymentVoucher.findUnique({
//       where: { id },
//       include: {
//         parentUser: { select: { id: true, fullName: true, phone: true } },
//         createdBy: { select: { id: true, fullName: true } },
//         payments: {
//           include: {
//             student: { select: { id: true, fullname: true, classId: true } },
//             user: { select: { id: true, fullName: true } },
//             allocations: {
//               include: {
//                 studentFee: { select: { month: true, year: true } },
//               },
//             },
//           },
//           orderBy: { date: "desc" },
//         },
//       },
//     });
//     if (!voucher) return res.status(404).json({ message: "Not found" });

//     // totals
//     const totals = voucher.payments.reduce(
//       (a, p) => {
//         a.amount += n(p.amountPaid);
//         a.discount += n(p.discount);
//         return a;
//       },
//       { amount: 0, discount: 0 }
//     );

//     return res.json({ ...voucher, totals, count: voucher.payments.length });
//   } catch (e: any) {
//     console.error(e);
//     return res.status(500).json({ message: "Server error", error: e?.message });
//   }
// }

// // GET /api/family-vouchers/stats/monthly
// export async function monthlyFamilyVoucherStats(req: Request, res: Response) {
//   try {
//     // Group vouchers by month/year of createdAt
//     const raw = await prisma.$queryRaw<
//       { y: number; m: number; count: number }[]
//     >`
//       SELECT
//         EXTRACT(YEAR  FROM "createdAt")::int AS y,
//         EXTRACT(MONTH FROM "createdAt")::int AS m,
//         COUNT(*)::int AS count
//       FROM "FamilyPaymentVoucher"
//       GROUP BY 1,2
//       ORDER BY 1 DESC, 2 DESC
//     `;
//     return res.json(
//       raw.map((r) => ({ year: r.y, month: r.m, count: r.count }))
//     );
//   } catch (e: any) {
//     console.error(e);
//     return res.status(500).json({ message: "Server error", error: e?.message });
//   }
// }

// src/controllers/familyVouchers.controller.ts
import { Prisma, PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();
const n = (d: Prisma.Decimal | null | undefined) => Number(d ?? 0);

export async function listFamilyVouchers(req: Request, res: Response) {
  try {
    const {
      search = "",
      from,
      to,
      page = "1",
      pageSize = "10",
      parentUserId,
      createdById,
      method,
    } = req.query as Record<string, string>;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const take = Math.max(parseInt(pageSize, 10) || 10, 1);
    const skip = (p - 1) * take;

    const createdAtFilter: any = {};
    if (from) createdAtFilter.gte = new Date(from);
    if (to) createdAtFilter.lte = new Date(to);

    const where: Prisma.FamilyPaymentVoucherWhereInput = {
      AND: [
        search
          ? {
              OR: [
                { voucherNo: { contains: search, mode: "insensitive" } },
                {
                  parentUser: {
                    fullName: { contains: search, mode: "insensitive" },
                  },
                },
                {
                  createdBy: {
                    fullName: { contains: search, mode: "insensitive" },
                  },
                },
              ],
            }
          : {},
        Object.keys(createdAtFilter).length
          ? { createdAt: createdAtFilter }
          : {},
        parentUserId ? { parentUserId: Number(parentUserId) } : {},
        createdById ? { createdById: Number(createdById) } : {},
        method ? { method } : {},
      ],
    };

    const total = await prisma.familyPaymentVoucher.count({ where });
    const vouchers = await prisma.familyPaymentVoucher.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        parentUser: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
      },
    });

    const ids = vouchers.map((v) => v.id);
    const grouped = ids.length
      ? await prisma.payment.groupBy({
          by: ["familyVoucherId"],
          where: { familyVoucherId: { in: ids } },
          _sum: { amountPaid: true, discount: true },
          _count: { _all: true },
        })
      : [];

    const sums = new Map<
      number,
      { amount: number; discount: number; count: number }
    >();
    for (const g of grouped) {
      if (g.familyVoucherId != null) {
        sums.set(g.familyVoucherId, {
          amount: n(g._sum.amountPaid),
          discount: n(g._sum.discount),
          count: g._count._all,
        });
      }
    }

    return res.json({
      page: p,
      pageSize: take,
      total,
      totalPages: Math.ceil(total / take),
      data: vouchers.map((v) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        method: v.method,
        notes: v.notes,
        createdAt: v.createdAt,
        // parentUser: v.parentUser,
        // createdBy: v.createdBy,
        totals: sums.get(v.id) ?? { amount: 0, discount: 0, count: 0 },
      })),
    });
  } catch (err: any) {
    console.error("listFamilyVouchers error:", err);
    return res
      .status(500)
      .json({ message: err?.message || "Failed to fetch vouchers" });
  }
}

export async function getFamilyVoucherById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ message: "Invalid voucher id" });

    const voucher = await prisma.familyPaymentVoucher.findUnique({
      where: { id },
      include: {
        parentUser: { select: { id: true, fullName: true } },
        createdBy: { select: { id: true, fullName: true } },
        payments: {
          include: {
            student: { select: { id: true, fullname: true, classId: true } },
            user: { select: { id: true, fullName: true } },
            allocations: {
              include: { studentFee: { select: { month: true, year: true } } },
            },
          },
          orderBy: { date: "desc" },
        },
      },
    });
    if (!voucher) return res.status(404).json({ message: "Voucher not found" });

    const totals = voucher.payments.reduce(
      (a, p) => ({
        amount: a.amount + n(p.amountPaid),
        discount: a.discount + n(p.discount),
      }),
      { amount: 0, discount: 0 }
    );

    return res.json({ ...voucher, totals, count: voucher.payments.length });
  } catch (err: any) {
    console.error("getFamilyVoucherById error:", err);
    return res
      .status(500)
      .json({ message: err?.message || "Failed to fetch voucher" });
  }
}

export async function monthlyFamilyVoucherStats(req: Request, res: Response) {
  try {
    const rows = await prisma.$queryRaw<
      { y: number; m: number; count: number }[]
    >`
      SELECT
        EXTRACT(YEAR  FROM "createdAt")::int AS y,
        EXTRACT(MONTH FROM "createdAt")::int AS m,
        COUNT(*)::int AS count
      FROM "FamilyPaymentVoucher"
      GROUP BY 1,2
      ORDER BY 1 DESC, 2 DESC
    `;
    return res.json(
      rows.map((r) => ({ year: r.y, month: r.m, count: r.count }))
    );
  } catch (err: any) {
    console.error("monthlyFamilyVoucherStats error:", err);
    return res
      .status(500)
      .json({ message: err?.message || "Failed to fetch stats" });
  }
}

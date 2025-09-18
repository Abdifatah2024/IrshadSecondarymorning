// src/helpers/paymentAllocation.ts
import { Prisma } from "@prisma/client";

export type Tx = Prisma.TransactionClient;

/** -------- Decimal helpers (TYPE-SAFE) -------- */
export const D = (
  v: number | string | Prisma.Decimal | null | undefined
): Prisma.Decimal =>
  v instanceof Prisma.Decimal ? v : new Prisma.Decimal(Number(v ?? 0) || 0);

/** Keep Prisma.Decimal through reduce */
export const Dsum = (
  arr: Array<number | string | Prisma.Decimal>
): Prisma.Decimal =>
  arr.reduce<Prisma.Decimal>((s, x) => s.plus(D(x)), new Prisma.Decimal(0));

export type StudentAllocationBreakdown = {
  studentId: number;
  studentName?: string;
  linePaid: number; // amountPaid
  lineDiscount: number; // discount
  lineNet: number; // amountPaid - discount
  applied: Array<{
    studentFeeId: number;
    month: number;
    year: number;
    applied: number; // net applied to this month
    isPaidAfter: boolean;
  }>;
  carryForwardAdded: number; // remainder parked to StudentAccount
};

/**
 * Allocate payment to oldest unpaid StudentFee rows.
 * Creates PaymentAllocation rows and updates StudentFee.isPaid accordingly.
 */
export async function allocatePaymentToStudentFees(
  tx: Tx,
  params: {
    paymentId: number;
    studentId: number;
    amountPaid: number | string | Prisma.Decimal;
    discount?: number | string | Prisma.Decimal;
    studentName?: string;
  }
): Promise<StudentAllocationBreakdown> {
  const { paymentId, studentId, amountPaid, discount = 0, studentName } = params;

  const paid = D(amountPaid);
  const disc = D(discount);
  let remaining = paid.minus(disc);

  const applied: StudentAllocationBreakdown["applied"] = [];

  if (remaining.gt(0)) {
    const fees = await tx.studentFee.findMany({
      where: { studentId, isPaid: false },
      orderBy: [{ year: "asc" }, { month: "asc" }, { id: "asc" }],
      select: {
        id: true,
        month: true,
        year: true,
        student_fee: true,
        PaymentAllocation: { select: { amount: true } },
      },
    });

    for (const fee of fees) {
      if (remaining.lte(0)) break;

      const base = D(fee.student_fee || 0);
      const already = Dsum(fee.PaymentAllocation.map((a: { amount: Prisma.Decimal }) => a.amount));
      const due = base.minus(already);
      if (due.lte(0)) continue;

      const pay = remaining.gt(due) ? due : remaining;

      await tx.paymentAllocation.create({
        data: {
          paymentId,
          studentFeeId: fee.id,
          amount: pay,
          studentId,
        },
      });

      remaining = remaining.minus(pay);

      const allocatedNow = already.plus(pay);
      const isPaidAfter = base.gt(0) && allocatedNow.gte(base);

      if (isPaidAfter) {
        await tx.studentFee.update({
          where: { id: fee.id },
          data: { isPaid: true },
        });
      }

      applied.push({
        studentFeeId: fee.id,
        month: fee.month,
        year: fee.year,
        applied: pay.toNumber(),
        isPaidAfter,
      });
    }
  }

  // Carry-forward remainder
  let carryForwardAdded = 0;
  if (remaining.gt(0)) {
    const acct = await tx.studentAccount.findUnique({ where: { studentId } });
    if (!acct) {
      await tx.studentAccount.create({
        data: { studentId, carryForward: remaining },
      });
    } else {
      await tx.studentAccount.update({
        where: { studentId },
        data: { carryForward: D(acct.carryForward).plus(remaining) },
      });
    }
    carryForwardAdded = remaining.toNumber();
  }

  return {
    studentId,
    studentName,
    linePaid: paid.toNumber(),
    lineDiscount: disc.toNumber(),
    lineNet: paid.minus(disc).toNumber(),
    applied,
    carryForwardAdded,
  };
}

export function summarizeVoucherMany(lines: StudentAllocationBreakdown[]) {
  const paid = Dsum(lines.map((l) => l.linePaid));
  const disc = Dsum(lines.map((l) => l.lineDiscount));
  return {
    totalPaid: paid.toNumber(),
    totalDiscount: disc.toNumber(),
    totalNet: paid.minus(disc).toNumber(),
  };
}

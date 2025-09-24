// import { Prisma } from "@prisma/client";
// import { prisma } from "../prisma";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
type Money = number;
const D = (v: Prisma.Decimal | number | null | undefined) =>
  new Prisma.Decimal(Number(v ?? 0));

export type FeeRow = {
  studentId: number;
  fullname: string;
  classId: number;
  phone?: string | null;
  bus?: string | null;
  month: number;
  year: number;
  fee: Money;
  paid: Money;
  due: Money; // fee - paid
  status: "PAID" | "UNPAID" | "PARTIAL";
};

export async function getStudentFeesWhere(where: Prisma.StudentFeeWhereInput) {
  const rows = await prisma.studentFee.findMany({
    where,
    include: {
      student: {
        select: {
          id: true,
          fullname: true,
          classId: true,
          phone: true,
          bus: true,
        },
      },
      PaymentAllocation: { select: { amount: true } },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }, { studentId: "asc" }],
  });

  return rows.map<FeeRow>((r) => {
    const paid = r.PaymentAllocation.reduce(
      (s, a) => D(s).plus(D(a.amount)),
      new Prisma.Decimal(0)
    ).toNumber();
    const fee = D(r.student_fee).toNumber();
    const due = +(fee - paid).toFixed(2);
    const status: FeeRow["status"] =
      paid <= 0 ? "UNPAID" : paid >= fee ? "PAID" : "PARTIAL";
    return {
      studentId: r.studentId,
      fullname: r.student.fullname,
      classId: r.student.classId,
      phone: r.student.phone,
      bus: r.student.bus ?? null,
      month: r.month,
      year: r.year,
      fee,
      paid,
      due,
      status,
    };
  });
}

/** Overdue = UNPAID or PARTIAL for any of the last `monthsBack` months within [from..to] */
export async function getOverdueStudents(params: {
  monthsBack: number;
  from?: Date;
  to?: Date;
  classId?: number;
  bus?: "with" | "without";
}) {
  const to = params.to ?? new Date();
  const from =
    params.from ??
    new Date(to.getFullYear(), to.getMonth() - (params.monthsBack - 1), 1);

  const fees = await getStudentFeesWhere({
    AND: [
      { OR: [{ isPaid: false }, { isPaid: true }] }, // include all, we re-compute from allocations
      { year: { gte: from.getFullYear(), lte: to.getFullYear() } },
    ],
  });

  const inRange = fees.filter((f) => {
    const d = new Date(f.year, f.month - 1, 1);
    return (
      d >= new Date(from.getFullYear(), from.getMonth(), 1) &&
      d <= new Date(to.getFullYear(), to.getMonth(), 1)
    );
  });

  const filtered = inRange.filter((f) => {
    if (params.classId && f.classId !== params.classId) return false;
    if (params.bus === "with" && !f.bus) return false;
    if (params.bus === "without" && f.bus) return false;
    return f.status !== "PAID";
  });

  // Collapse to 1 record per student with total due in the window
  const map = new Map<
    number,
    {
      studentId: number;
      fullname: string;
      classId: number;
      phone?: string | null;
      bus?: string | null;
      months: number[];
      due: number;
    }
  >();
  for (const r of filtered) {
    const cur = map.get(r.studentId) ?? {
      studentId: r.studentId,
      fullname: r.fullname,
      classId: r.classId,
      phone: r.phone,
      bus: r.bus,
      months: [],
      due: 0,
    };
    cur.months.push(r.month);
    cur.due += r.due;
    map.set(r.studentId, cur);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.fullname.localeCompare(b.fullname)
  );
}

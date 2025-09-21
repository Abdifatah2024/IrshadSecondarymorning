import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
export type Range = { from?: Date; to?: Date };

export const getAllStudents = async (className?: string) => {
  return prisma.student.findMany({
    where: {
      isdeleted: false,
      ...(className
        ? { classes: { name: { contains: className, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      fullname: true,
      classId: true,
      phone: true,
      bus: true,
      classes: { select: { name: true } },
    },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });
};

/**
 * Helpers to bound a month range (UTC).
 */
const monthBounds = (month: number, year: number) => {
  const from = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month, 1, 0, 0, 0));
  return { from, to };
};

const sumDecimal = (arr: Decimal[]) => arr.reduce((a, b) => a + Number(b), 0);

/**
 * We assume Student.fee = monthly fee.
 * Balance = fee - Σ(payments.amountPaid + discount) within month window.
 */
export const getStudentsWithBalance = async (
  month: number,
  year: number,
  className?: string
) => {
  const { from, to } = monthBounds(month, year);

  const students = await prisma.student.findMany({
    where: {
      isdeleted: false,
      ...(className
        ? { classes: { name: { contains: className, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      fullname: true,
      fee: true,
      classId: true,
      classes: { select: { name: true } },
      Payment: {
        where: { date: { gte: from, lt: to } },
        select: { amountPaid: true, discount: true },
      },
    },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });

  return students
    .map((s) => {
      const paid =
        sumDecimal(s.Payment.map((p) => p.amountPaid)) +
        sumDecimal(s.Payment.map((p) => p.discount));
      const balance = Number(s.fee) - paid;
      return {
        id: s.id,
        fullname: s.fullname,
        className: s.classes?.name,
        monthlyFee: Number(s.fee),
        paid,
        balance: Math.max(0, Number(balance.toFixed(2))),
      };
    })
    .filter((x) => x.balance > 0.01);
};

/**
 * Unpaid family report:
 * We assume family is grouped by Student.familyName (nullable).
 * Unpaid means (monthlyFee - monthlyPaid) > 0 for at least one student in family.
 */
export const getUnpaidFamily = async (month: number, year: number) => {
  const { from, to } = monthBounds(month, year);
  const students = await prisma.student.findMany({
    where: { isdeleted: false },
    select: {
      id: true,
      fullname: true,
      familyName: true,
      fee: true,
      Payment: {
        where: { date: { gte: from, lt: to } },
        select: { amountPaid: true, discount: true },
      },
    },
  });

  const familiesMap = new Map<
    string,
    { members: any[]; totalFee: number; totalPaid: number }
  >();

  for (const s of students) {
    const family = s.familyName ?? `student:${s.id}`;
    const paid =
      sumDecimal(s.Payment.map((p) => p.amountPaid)) +
      sumDecimal(s.Payment.map((p) => p.discount));
    const entry = familiesMap.get(family) ?? {
      members: [],
      totalFee: 0,
      totalPaid: 0,
    };
    entry.members.push({
      id: s.id,
      fullname: s.fullname,
      monthlyFee: Number(s.fee),
      paid,
    });
    entry.totalFee += Number(s.fee);
    entry.totalPaid += paid;
    familiesMap.set(family, entry);
  }

  return Array.from(familiesMap.entries())
    .map(([familyName, v]) => ({
      familyName,
      members: v.members,
      totalFee: Number(v.totalFee.toFixed(2)),
      totalPaid: Number(v.totalPaid.toFixed(2)),
      balance: Number((v.totalFee - v.totalPaid).toFixed(2)),
    }))
    .filter((f) => f.balance > 0.01)
    .sort((a, b) => a.familyName.localeCompare(b.familyName));
};

export const getUnpaidFamilySummary = async (month: number, year: number) => {
  const rows = await getUnpaidFamily(month, year);
  const totals = rows.reduce(
    (acc, r) => {
      acc.totalFamilies += 1;
      acc.totalFee += r.totalFee;
      acc.totalPaid += r.totalPaid;
      acc.totalBalance += r.balance;
      return acc;
    },
    { totalFamilies: 0, totalFee: 0, totalPaid: 0, totalBalance: 0 }
  );
  return { summary: totals, rows };
};

export const getFreeStudents = async (className?: string) => {
  return prisma.student.findMany({
    where: {
      isdeleted: false,
      OR: [{ FreeReason: { not: null } }, { fee: 0 }],
      ...(className
        ? { classes: { name: { contains: className, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      fullname: true,
      classId: true,
      classes: { select: { name: true } },
      FreeReason: true,
      fee: true,
    },
    orderBy: [{ classId: "asc" }, { fullname: "asc" }],
  });
};

export const getLastPaymentVoucher = async (studentQuery: string) => {
  // find the student by name/phone/id
  const student = await prisma.student.findFirst({
    where: {
      isdeleted: false,
      OR: [
        { fullname: { contains: studentQuery, mode: "insensitive" } },
        { phone: { contains: studentQuery } },
        { rollNumber: { contains: studentQuery } },
      ],
    },
    select: { id: true, fullname: true, classes: { select: { name: true } } },
  });
  if (!student) return null;

  const payment = await prisma.payment.findFirst({
    where: { studentId: student.id },
    orderBy: { date: "desc" },
    select: {
      id: true,
      amountPaid: true,
      discount: true,
      Description: true,
      date: true,
      //   familyPaymentVoucherId: true,
      user: { select: { fullName: true } },
    },
  });

  return { student, payment };
};

export const getStudentBusses = async (bus?: string, className?: string) => {
  return prisma.student.findMany({
    where: {
      isdeleted: false,
      ...(bus ? { bus: { contains: bus, mode: "insensitive" } } : {}),
      ...(className
        ? { classes: { name: { contains: className, mode: "insensitive" } } }
        : {}),
    },
    select: {
      id: true,
      fullname: true,
      bus: true,
      classes: { select: { name: true } },
    },
    orderBy: [{ bus: "asc" }, { fullname: "asc" }],
  });
};

export const getStudentsWithSameBus = async (bus: string) => {
  return prisma.student.findMany({
    where: { isdeleted: false, bus: { equals: bus } },
    select: {
      id: true,
      fullname: true,
      bus: true,
      classes: { select: { name: true } },
    },
    orderBy: [{ fullname: "asc" }],
  });
};

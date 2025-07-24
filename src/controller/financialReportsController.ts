// controllers/financialReportsController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getIncomeStatement = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required." });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch allocations where the PAYMENT DATE is within the selected month
    const allocations = await prisma.paymentAllocation.findMany({
      where: {
        payment: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        payment: true,
        studentFee: true,
      },
    });

    let currentIncome = 0;
    let previousIncome = 0;
    let advanceIncome = 0;

    allocations.forEach((alloc) => {
      const allocMonth = alloc.studentFee.month;
      const allocYear = alloc.studentFee.year;
      const amount = Number(alloc.amount);

      if (allocYear === year && allocMonth === month) {
        currentIncome += amount;
      } else if (
        allocYear < year ||
        (allocYear === year && allocMonth < month)
      ) {
        previousIncome += amount;
      } else {
        advanceIncome += amount;
      }
    });

    const totalRevenue = currentIncome + previousIncome + advanceIncome;

    // Discounts applied during this month
    const discounts = await prisma.payment.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      select: { discount: true },
    });

    const totalDiscounts = discounts.reduce(
      (sum, p) => sum + Number(p.discount || 0),
      0
    );

    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
      select: { amount: true },
    });
    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    res.status(200).json({
      month,
      year,
      currentIncome,
      previousIncome,
      advanceIncome,
      totalRevenue,
      totalDiscounts,
      netRevenue,
      totalExpenses,
      totalEmployeeAdvances,
      netIncome,
    });
  } catch (error) {
    console.error("Error generating income statement:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getBalanceSheet = async (_req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      where: { isdeleted: false, status: "ACTIVE" },
      include: {
        StudentAccount: true,
        StudentFee: {
          where: { isPaid: false },
          include: {
            PaymentAllocation: true,
            student: { select: { fee: true } },
          },
        },
      },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;

    for (const student of students) {
      const carryForward = Number(student.StudentAccount?.carryForward || 0);
      totalAssets += carryForward;

      for (const fee of student.StudentFee) {
        const paid = fee.PaymentAllocation.reduce(
          (sum, a) => sum + Number(a.amount),
          0
        );
        const expected = Number(student.fee);
        const due = Math.max(0, expected - paid);
        totalLiabilities += due;
      }
    }

    const equity = totalAssets - totalLiabilities;

    res.status(200).json({
      totalAssets,
      totalLiabilities,
      equity,
    });
  } catch (error) {
    console.error("Error generating balance sheet:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
export const getQuarterlyIncomeStatement = async (
  req: Request,
  res: Response
) => {
  try {
    const quarter = Number(req.query.quarter);
    const year = Number(req.query.year);

    if (![1, 2, 3, 4].includes(quarter) || !year) {
      return res
        .status(400)
        .json({ message: "Valid quarter (1-4) and year are required." });
    }

    // Calculate quarter start and end dates
    const startMonth = (quarter - 1) * 3;
    const endMonth = startMonth + 2;

    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, endMonth + 1, 0, 23, 59, 59, 999); // End of last month in quarter

    const allocations = await prisma.paymentAllocation.findMany({
      where: {
        payment: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      include: {
        payment: true,
        studentFee: true,
      },
    });

    let currentIncome = 0;
    let previousIncome = 0;
    let advanceIncome = 0;

    allocations.forEach((alloc) => {
      const allocMonth = alloc.studentFee.month;
      const allocYear = alloc.studentFee.year;
      const amount = Number(alloc.amount);

      const isWithinQuarter =
        allocYear === year &&
        allocMonth >= startMonth + 1 &&
        allocMonth <= endMonth + 1;

      if (isWithinQuarter) {
        currentIncome += amount;
      } else if (
        allocYear < year ||
        (allocYear === year && allocMonth < startMonth + 1)
      ) {
        previousIncome += amount;
      } else {
        advanceIncome += amount;
      }
    });

    const totalRevenue = currentIncome + previousIncome + advanceIncome;

    const discounts = await prisma.payment.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
      select: { discount: true },
    });
    const totalDiscounts = discounts.reduce(
      (sum, p) => sum + Number(p.discount || 0),
      0
    );

    const advances = await prisma.employeeAdvance.findMany({
      where: {
        year,
        month: {
          gte: startMonth + 1,
          lte: endMonth + 1,
        },
      },
      select: { amount: true },
    });
    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    res.status(200).json({
      quarter,
      year,
      currentIncome,
      previousIncome,
      advanceIncome,
      totalRevenue,
      totalDiscounts,
      netRevenue,
      totalExpenses,
      totalEmployeeAdvances,
      netIncome,
      startDate,
      endDate,
    });
  } catch (error) {
    console.error("Quarterly income error:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getYearlyIncomeStatement = async (req: Request, res: Response) => {
  try {
    const year = Number(req.query.year);
    if (!year) {
      return res.status(400).json({ message: "Year is required." });
    }

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const allocations = await prisma.paymentAllocation.findMany({
      where: {
        payment: {
          date: {
            gte: yearStart,
            lte: yearEnd,
          },
        },
      },
      include: {
        payment: true,
        studentFee: true,
      },
    });

    let currentIncome = 0;
    let previousIncome = 0;
    let advanceIncome = 0;

    allocations.forEach((alloc) => {
      const allocYear = alloc.studentFee.year;
      const allocMonth = alloc.studentFee.month;
      const amount = Number(alloc.amount);

      if (allocYear === year) {
        currentIncome += amount;
      } else if (allocYear < year) {
        previousIncome += amount;
      } else {
        advanceIncome += amount;
      }
    });

    const totalRevenue = currentIncome + previousIncome + advanceIncome;

    const discounts = await prisma.payment.findMany({
      where: {
        date: { gte: yearStart, lte: yearEnd },
      },
      select: { discount: true },
    });
    const totalDiscounts = discounts.reduce(
      (sum, p) => sum + Number(p.discount || 0),
      0
    );

    const advances = await prisma.employeeAdvance.findMany({
      where: { year },
      select: { amount: true },
    });
    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
      select: { amount: true },
    });
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    res.status(200).json({
      year,
      currentIncome,
      previousIncome,
      advanceIncome,
      totalRevenue,
      totalDiscounts,
      netRevenue,
      totalExpenses,
      totalEmployeeAdvances,
      netIncome,
    });
  } catch (error) {
    console.error("Error generating yearly income statement:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

// Cash Flow Report: Cash In = Payments; Cash Out = Advances + Expenses

export const getCashFlowStatement = async (req: Request, res: Response) => {
  try {
    const month = Number(req.query.month);
    const year = Number(req.query.year);
    if (!month || !year) {
      return res.status(400).json({ message: "Month and year are required." });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // ✅ Only summing actual amountPaid — no discount
    const payments = await prisma.payment.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { amountPaid: true },
    });

    const cashInflow = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );

    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
      select: { amount: true },
    });

    const advanceOutflow = advances.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    const expenses = await prisma.expense.findMany({
      where: { date: { gte: startDate, lte: endDate } },
      select: { amount: true },
    });

    const expenseOutflow = expenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0
    );

    const netCashFlow = cashInflow - (advanceOutflow + expenseOutflow);

    res.status(200).json({
      month,
      year,
      cashInflow,
      advanceOutflow,
      expenseOutflow,
      netCashFlow,
    });
  } catch (error) {
    console.error("Error generating cash flow:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};

export const getStudentsWithUnpaidFeesOrBalance = async (
  _req: Request,
  res: Response
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        status: "ACTIVE",
      },
      include: {
        StudentFee: {
          include: {
            PaymentAllocation: {
              select: {
                amount: true,
              },
            },
          },
        },
        StudentAccount: true,
      },
    });

    const result = [];

    for (const student of students) {
      const feeAmount = Number(student.fee);
      let totalRequired = 0;
      let totalPaid = 0;
      let unpaidMonths = 0;

      for (const fee of student.StudentFee) {
        const paidForThisMonth = fee.PaymentAllocation.reduce(
          (sum, alloc) => sum + Number(alloc.amount),
          0
        );

        totalPaid += paidForThisMonth;
        totalRequired += feeAmount;

        if (!fee.isPaid && paidForThisMonth < feeAmount) {
          unpaidMonths++;
        }
      }

      const carryForward = Number(student.StudentAccount?.carryForward || 0);
      const balanceDue = Math.max(0, totalRequired - totalPaid - carryForward);

      // ✅ Only include students with remaining balance
      if (balanceDue > 0) {
        result.push({
          studentId: student.id,
          name: student.fullname,
          totalRequired,
          totalPaid,
          unpaidMonths,
          carryForward,
          balanceDue,
        });
      }
    }

    res.status(200).json({
      count: result.length,
      students: result,
    });
  } catch (error) {
    console.error("Error calculating balances:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getCombinedPayments = async (_req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { date: "desc" },
      include: {
        student: { select: { id: true, fullname: true } },
        user: { select: { id: true, fullName: true } },
        allocations: {
          include: {
            studentFee: {
              select: { month: true, year: true },
            },
          },
        },
      },
    });

    const result = payments.map((payment) => ({
      paymentId: payment.id,
      studentId: payment.student.id,
      studentName: payment.student.fullname,
      amountPaid: Number(payment.amountPaid),
      discount: Number(payment.discount),
      paidTo: payment.user.fullName,
      date: payment.date,
      allocations: payment.allocations.map((alloc) => ({
        month: alloc.studentFee.month,
        year: alloc.studentFee.year,
        amount: Number(alloc.amount),
      })),
    }));

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching combined payments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getTodayIncome = async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date(today.setHours(23, 59, 59, 999));

    const paymentsToday = await prisma.payment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amountPaid: true,
        discount: true,
      },
    });

    const amountPaidToday = paymentsToday.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );

    const totalDiscountToday = paymentsToday.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );

    const unpaidFees = await prisma.studentFee.findMany({
      where: {
        isPaid: false,
        student: {
          isdeleted: false,
          status: "ACTIVE",
        },
      },
      include: {
        student: { select: { fee: true } },
        PaymentAllocation: { select: { amount: true } },
      },
    });

    const unpaidBalance = unpaidFees.reduce((sum, fee) => {
      const expected = Number(fee.student.fee || 0);
      const paid = fee.PaymentAllocation.reduce(
        (s, a) => s + Number(a.amount),
        0
      );
      return sum + Math.max(0, expected - paid);
    }, 0);

    res.status(200).json({
      date: new Date().toISOString().split("T")[0],
      amountPaidToday,
      totalDiscountToday,
      unpaidBalance,
    });
  } catch (error) {
    console.error("Error fetching today's payment summary:", error);
    res.status(500).json({
      message: "Internal server error",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
import { getMonthlyFinancialStatus } from "../prisma/utlis/utils/finance";
const prisma = new PrismaClient();

export const createExpense = async (req: Request, res: Response) => {
  try {
    const { category, amount, date, paymentMethod, description, approvedBy } =
      req.body;
    //@ts-ignore
    const userId = req.user?.useId;
    const expenseDate = new Date(date);
    const month = expenseDate.getMonth() + 1;
    const year = expenseDate.getFullYear();

    if (!category || !amount || amount <= 0 || !paymentMethod) {
      return res.status(400).json({ message: "Invalid fields." });
    }

    const financials = await getMonthlyFinancialStatus(month, year, prisma);

    if (amount > financials.remaining) {
      return res.status(400).json({
        message: `Cannot create expense. Remaining balance: $${financials.remaining}`,
      });
    }

    const expense = await prisma.expense.create({
      data: {
        category,
        amount,
        date: expenseDate,
        paymentMethod,
        description,
        approvedBy,
        userId,
      },
    });

    res.status(201).json({ message: "Expense created", expense });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: "desc" },
      include: {
        user: { select: { fullName: true, email: true } },
      },
    });
    res.status(200).json({ count: expenses.length, expenses });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { user: { select: { fullName: true } } },
    });

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    res.status(200).json({ expense });
  } catch (error) {
    console.error("Error fetching expense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      category,
      amount,
      date,
      description,
      paymentMethod,
      approvedBy,
      receiptUrl,
    } = req.body;

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Expense not found" });
    }

    if (!category || !amount || amount <= 0 || !paymentMethod || !date) {
      return res.status(400).json({ message: "Invalid input fields" });
    }

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        category,
        amount,
        date: new Date(date),
        description,
        paymentMethod,
        approvedBy,
        receiptUrl,
      },
    });

    res.status(200).json({ message: "Expense updated", expense: updated });
  } catch (error) {
    console.error("Error updating expense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: "Expense not found" });
    }

    await prisma.expense.delete({ where: { id } });
    res.status(200).json({ message: "Expense deleted", deletedId: id });
  } catch (error) {
    console.error("Error deleting expense:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// export const getMonthlyBalance = async (req: Request, res: Response) => {
//   try {
//     const month = parseInt(req.query.month as string);
//     const year = parseInt(req.query.year as string);

//     if (!month || !year) {
//       return res.status(400).json({ message: "Month and Year are required." });
//     }

//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0, 23, 59, 59, 999);

//     // Total income
//     const allocations = await prisma.paymentAllocation.findMany({
//       where: {
//         payment: {
//           date: {
//             gte: startDate,
//             lte: endDate,
//           },
//         },
//       },
//       select: { amount: true },
//     });

//     const totalIncome = allocations.reduce(
//       (sum, alloc) => sum + Number(alloc.amount),
//       0
//     );

//     // Total advance
//     const advances = await prisma.employeeAdvance.findMany({
//       where: { month, year },
//       select: { amount: true },
//     });

//     const totalAdvance = advances.reduce(
//       (sum, adv) => sum + Number(adv.amount),
//       0
//     );

//     // Total expense
//     const expenses = await prisma.expense.findMany({
//       where: {
//         date: {
//           gte: startDate,
//           lte: endDate,
//         },
//       },
//       select: { amount: true },
//     });

//     const totalExpense = expenses.reduce(
//       (sum, exp) => sum + Number(exp.amount),
//       0
//     );

//     const used = totalAdvance + totalExpense;
//     const remaining = totalIncome - used;

//     return res.status(200).json({
//       totalIncome,
//       totalAdvance,
//       totalExpense,
//       used,
//       remaining,
//     });
//   } catch (error) {
//     console.error("Error calculating balance:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
export const getMonthlyBalance = async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required." });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // ✅ Total income = amountPaid only
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amountPaid: true,
      },
    });

    const totalIncome = payments.reduce((sum, p) => {
      return sum + Number(p.amountPaid);
    }, 0);

    // ✅ Total advance
    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
      select: { amount: true },
    });

    const totalAdvance = advances.reduce(
      (sum, adv) => sum + Number(adv.amount),
      0
    );

    // ✅ Total expense
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: { amount: true },
    });

    const totalExpense = expenses.reduce(
      (sum, exp) => sum + Number(exp.amount),
      0
    );

    // ✅ Final calculations
    const used = totalAdvance + totalExpense;
    const remaining = totalIncome - used;

    return res.status(200).json({
      totalIncome,
      totalAdvance,
      totalExpense,
      used,
      remaining,
    });
  } catch (error) {
    console.error("Error calculating balance:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const month = parseInt(req.query.month as string);
    const year = parseInt(req.query.year as string);

    if (!month || !year) {
      return res.status(400).json({ message: "Month and Year are required" });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    // Fetch standard expenses
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        category: true,
        amount: true,
      },
    });

    // Fetch employee advances (treat as an expense category)
    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
      select: { amount: true },
    });

    const summaryMap: Record<string, number> = {};
    let total = 0;

    // Add expenses
    expenses.forEach((exp) => {
      const cat = exp.category || "Uncategorized";
      summaryMap[cat] = (summaryMap[cat] || 0) + Number(exp.amount);
      total += Number(exp.amount);
    });

    // Add advances as a new category
    const totalAdvance = advances.reduce((sum, a) => sum + Number(a.amount), 0);
    if (totalAdvance > 0) {
      summaryMap["Employee Advances"] =
        (summaryMap["Employee Advances"] || 0) + totalAdvance;
      total += totalAdvance;
    }

    const categorySummary = Object.entries(summaryMap).map(
      ([category, amount]) => ({
        category,
        amount,
      })
    );

    return res.status(200).json({
      month,
      year,
      totalExpenses: total,
      categorySummary,
    });
  } catch (error) {
    console.error("Error generating expense summary:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

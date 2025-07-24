// controllers/profitLogController.ts
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createProfitLogAndAutoDeposit = async (
  req: Request,
  res: Response
) => {
  const {
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
    notes,
  } = req.body;
  //@ts-ignore
  const userId = req.body.userId || req.user?.id;

  if (!month || !year || userId === undefined) {
    return res
      .status(400)
      .json({ message: "Month, year, and user ID are required" });
  }

  try {
    // Check for duplicate
    const existing = await prisma.profitLog.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "ProfitLog for this month already exists" });
    }

    // Create ProfitLog
    const profitLog = await prisma.profitLog.create({
      data: {
        month,
        year,
        closedById: userId,
        currentIncome,
        previousIncome,
        advanceIncome,
        totalRevenue,
        totalDiscounts,
        netRevenue,
        totalExpenses,
        totalEmployeeAdvances,
        netIncome,
        notes,
      },
    });

    // Get latest balance
    const lastLedger = await prisma.cashLedger.findFirst({
      orderBy: { id: "desc" },
    });

    const previousBalance = lastLedger?.balanceAfter || 0;

    // Determine type and create ledger entry
    const transactionType = netIncome >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    const absoluteAmount = Math.abs(netIncome);
    const newBalance =
      transactionType === "DEPOSIT"
        ? previousBalance + absoluteAmount
        : previousBalance - absoluteAmount;

    await prisma.cashLedger.create({
      data: {
        date: new Date(),
        type: transactionType,
        source: "ProfitLog",
        referenceId: profitLog.id,
        amount: absoluteAmount,
        method: "Bank", // or "Cash", make configurable if needed
        description:
          transactionType === "DEPOSIT"
            ? `Deposit from Profit (Month ${month}/${year})`
            : `Withdrawal to cover loss (Month ${month}/${year})`,
        balanceAfter: newBalance,
        createdById: userId,
      },
    });

    return res.status(201).json({
      message: "ProfitLog created and cash ledger updated",
      profitLog,
    });
  } catch (error) {
    console.error("Profit log creation failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const AutoUpdateProfitLog = async (req: Request, res: Response) => {
  try {
    const { month, year, notes } = req.body;
    //@ts-ignore
    const userId = req.user?.id; // Ensure middleware sets this from token

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    const existing = await prisma.profitLog.findUnique({
      where: {
        month_year: {
          month,
          year,
        },
      },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "ProfitLog not found for this month/year." });
    }

    // Payments & Discounts
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });
    const currentIncome = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );
    const totalDiscounts = payments.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );

    // Previous Month Income
    let previousIncome = 0;
    const prev = await prisma.profitLog.findUnique({
      where: {
        month_year: {
          month: month === 1 ? 12 : month - 1,
          year: month === 1 ? year - 1 : year,
        },
      },
    });
    if (prev) previousIncome = prev.currentIncome;

    // Expenses
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Employee Advances
    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
    });
    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + a.amount,
      0
    );

    // Totals
    const advanceIncome = 0; // Update this when you add other income types
    const totalRevenue = currentIncome + advanceIncome;
    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    // Update the ProfitLog
    const updated = await prisma.profitLog.update({
      where: {
        month_year: {
          month,
          year,
        },
      },
      data: {
        currentIncome,
        previousIncome,
        advanceIncome,
        totalRevenue,
        totalDiscounts,
        netRevenue,
        totalExpenses,
        totalEmployeeAdvances,
        netIncome,
        notes: notes || existing.notes,
      },
    });

    // Optional: Auto-Deposit to CashLedger if netIncome > 0 and not deposited yet
    const existingLedger = await prisma.cashLedger.findFirst({
      where: {
        type: "DEPOSIT",
        source: "ProfitLog",
        referenceId: updated.id,
      },
    });

    if (!existingLedger && netIncome > 0 && userId) {
      const latestBalance = await prisma.cashLedger.findFirst({
        orderBy: { date: "desc" },
      });

      const newBalance = (latestBalance?.balanceAfter || 0) + netIncome;

      await prisma.cashLedger.create({
        data: {
          type: "DEPOSIT",
          source: "ProfitLog",
          referenceId: updated.id,
          amount: netIncome,
          method: "Bank", // or "Cash", etc.
          description: `Auto deposit for ${month}/${year}`,
          balanceAfter: newBalance,
          createdById: userId,
        },
      });
    }

    return res
      .status(200)
      .json({ message: "ProfitLog updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating profit log:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createProfitLog = async (req: Request, res: Response) => {
  try {
    const { month, year, notes } = req.body;
    //@ts-ignore
    const userId = req.user?.id;

    if (!month || !year || !userId) {
      return res
        .status(400)
        .json({ message: "month, year, and user ID are required" });
    }

    // Prevent duplicate
    const existing = await prisma.profitLog.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing) {
      return res
        .status(400)
        .json({ message: "ProfitLog for this month/year already exists." });
    }

    // Get current month payments
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });

    const currentIncome = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );
    const totalDiscounts = payments.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );

    // Previous income (from last month)
    const prev = await prisma.profitLog.findUnique({
      where: {
        month_year: {
          month: month === 1 ? 12 : month - 1,
          year: month === 1 ? year - 1 : year,
        },
      },
    });
    const previousIncome = prev ? prev.currentIncome : 0;

    // Get all expenses
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
    });
    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + a.amount,
      0
    );

    const advanceIncome = 0;
    const totalRevenue = currentIncome + advanceIncome;
    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    // Create ProfitLog
    const profitLog = await prisma.profitLog.create({
      data: {
        month,
        year,
        closedById: userId,
        currentIncome,
        previousIncome,
        advanceIncome,
        totalRevenue,
        totalDiscounts,
        netRevenue,
        totalExpenses,
        totalEmployeeAdvances,
        netIncome,
        notes,
      },
      include: {
        closedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Auto deposit into CashLedger if netIncome > 0
    if (netIncome > 0) {
      const lastLedger = await prisma.cashLedger.findFirst({
        orderBy: { id: "desc" },
      });
      const previousBalance = lastLedger?.balanceAfter || 0;

      await prisma.cashLedger.create({
        data: {
          type: "DEPOSIT",
          source: "ProfitLog",
          referenceId: profitLog.id,
          amount: netIncome,
          method: "Bank", // Or customize
          description: `Monthly profit deposit for ${month}/${year}`,
          balanceAfter: previousBalance + netIncome,
          createdById: userId,
        },
      });
    }

    return res
      .status(201)
      .json({ message: "ProfitLog created", data: profitLog });
  } catch (error) {
    console.error("Create ProfitLog error:", error);
    return res
      .status(500)
      .json({ message: "Server error while creating profit log" });
  }
};

// src/controller/profitLogController.ts

export const autoCreateProfitLogAndDeposit = async (
  req: Request,
  res: Response
) => {
  try {
    const { month, year } = req.body;
    //@ts-ignore
    const userId = req.user?.useId || req.body.useId;

    if (!month || !year || !userId) {
      return res
        .status(400)
        .json({ message: "Month, year, and user ID are required" });
    }

    // Check if ProfitLog already exists
    const existing = await prisma.profitLog.findUnique({
      where: { month_year: { month, year } },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "ProfitLog for this month already exists" });
    }

    // Calculate current income and discounts from payments
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });

    const currentIncome = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );
    const totalDiscounts = payments.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );

    // Get previous month's income if available
    const previous = await prisma.profitLog.findUnique({
      where: {
        month_year: {
          month: month === 1 ? 12 : month - 1,
          year: month === 1 ? year - 1 : year,
        },
      },
    });

    const previousIncome = previous?.currentIncome || 0;

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Get employee advances
    const advances = await prisma.employeeAdvance.findMany({
      where: { month, year },
    });

    const totalEmployeeAdvances = advances.reduce(
      (sum, a) => sum + a.amount,
      0
    );

    // Final calculations
    const advanceIncome = 0;
    const totalRevenue = currentIncome + advanceIncome;
    const netRevenue = totalRevenue - totalDiscounts;
    const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;

    // Create ProfitLog
    const profitLog = await prisma.profitLog.create({
      data: {
        month,
        year,
        closedById: userId,
        currentIncome,
        previousIncome,
        advanceIncome,
        totalRevenue,
        totalDiscounts,
        netRevenue,
        totalExpenses,
        totalEmployeeAdvances,
        netIncome,
        notes: `Auto generated for ${new Date(
          `${year}-${month}-01`
        ).toLocaleString("default", { month: "long" })}`,
      },
    });

    // Get last cash ledger balance
    const lastLedger = await prisma.cashLedger.findFirst({
      orderBy: { id: "desc" },
    });

    const previousBalance = lastLedger?.balanceAfter || 0;

    // Auto deposit/withdrawal
    const transactionType = netIncome >= 0 ? "DEPOSIT" : "WITHDRAWAL";
    const absoluteAmount = Math.abs(netIncome);
    const newBalance =
      transactionType === "DEPOSIT"
        ? previousBalance + absoluteAmount
        : previousBalance - absoluteAmount;

    const ledger = await prisma.cashLedger.create({
      data: {
        date: new Date(),
        type: transactionType,
        source: "ProfitLog",
        referenceId: profitLog.id,
        amount: absoluteAmount,
        method: "Bank",
        description:
          transactionType === "DEPOSIT"
            ? `Deposit from Profit (Month ${month}/${year})`
            : `Withdrawal to cover loss (Month ${month}/${year})`,
        balanceAfter: newBalance,
        createdById: userId,
      },
    });

    return res.status(201).json({
      message: "ProfitLog created and auto-deposit/withdrawal recorded",
      profitLog,
      ledger,
    });
  } catch (error) {
    console.error("Profit log creation failed:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// CREATE ProfitLog
export const createProfitLog = async (req: Request, res: Response) => {
  try {
    const {
      month,
      year,
      closedById,
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

    // Check if a record for the same month and year already exists
    const exists = await prisma.profitLog.findUnique({
      where: { month_year: { month, year } },
    });
    if (exists) {
      return res
        .status(400)
        .json({ message: "ProfitLog for this month and year already exists." });
    }

    const newLog = await prisma.profitLog.create({
      data: {
        month,
        year,
        closedById,
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

    res.status(201).json({ success: true, data: newLog });
  } catch (error) {
    console.error("Create ProfitLog error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create ProfitLog." });
  }
};

// GET all ProfitLogs
export const getAllProfitLogs = async (_: Request, res: Response) => {
  try {
    const logs = await prisma.profitLog.findMany({
      orderBy: { closedAt: "desc" },
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
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    console.error("Fetch ProfitLogs error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch ProfitLogs." });
  }
};

// GET ProfitLog by ID
export const getProfitLogById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const log = await prisma.profitLog.findUnique({
      where: { id: Number(id) },
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
    if (!log) return res.status(404).json({ message: "ProfitLog not found" });
    res.status(200).json({ success: true, data: log });
  } catch (error) {
    console.error("Fetch ProfitLog error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch ProfitLog." });
  }
};

// UPDATE ProfitLog
export const updateProfitLog = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;
  try {
    const updated = await prisma.profitLog.update({
      where: { id: Number(id) },
      data: updateData,
    });
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error("Update ProfitLog error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update ProfitLog." });
  }
};

// DELETE ProfitLog
export const deleteProfitLog = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.profitLog.delete({ where: { id: Number(id) } });
    res
      .status(200)
      .json({ success: true, message: "ProfitLog deleted successfully." });
  } catch (error) {
    console.error("Delete ProfitLog error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to delete ProfitLog." });
  }
};

// controllers/profitLogController.ts

export const createProfitLogAuto = async (req: Request, res: Response) => {
  try {
    const { month, year, closedById, notes } = req.body;

    if (!month || !year || !closedById) {
      return res
        .status(400)
        .json({ message: "month, year, closedById are required" });
    }

    // Check duplicate
    const existing = await prisma.profitLog.findFirst({
      where: { month, year },
    });
    if (existing) {
      return res
        .status(400)
        .json({ message: "Profit log already exists for this month/year" });
    }

    // Fetch totals from system
    const payments = await prisma.payment.findMany({
      where: {
        date: {
          gte: new Date(`${year}-${month}-01`),
          lt: new Date(`${year}-${month + 1}-01`),
        },
      },
    });

    const totalRevenue = payments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );
    const totalDiscounts = payments.reduce(
      (sum, p) => sum + Number(p.discount),
      0
    );
    const netRevenue = totalRevenue - totalDiscounts;

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
      where: {
        month,
        year,
      },
    });
    const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);

    const previousMonth = month === 1 ? 12 : month - 1;
    const previousYear = month === 1 ? year - 1 : year;

    const prevProfit = await prisma.profitLog.findFirst({
      where: {
        month: previousMonth,
        year: previousYear,
      },
    });

    const previousIncome = prevProfit?.netIncome || 0;

    const netIncome = netRevenue - totalExpenses - totalAdvances;

    const profitLog = await prisma.profitLog.create({
      data: {
        month,
        year,
        closedById,
        notes,
        currentIncome: netRevenue,
        previousIncome,
        advanceIncome: totalAdvances,
        totalRevenue,
        totalDiscounts,
        netRevenue,
        totalExpenses,
        totalEmployeeAdvances: totalAdvances,
        netIncome,
      },
    });

    res
      .status(201)
      .json({ success: true, message: "Profit log created", data: profitLog });
  } catch (error) {
    console.error("Profit log error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getProfitLogsByYear = async (req: Request, res: Response) => {
  const { year } = req.params;
  try {
    const logs = await prisma.profitLog.findMany({
      where: { year: Number(year) },
      orderBy: { month: "asc" },
    });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ message: "Error fetching year data." });
  }
};

// controllers/profitLogController.ts

export const AutoUpdateProfitLog = async (req: Request, res: Response) => {
  try {
    const { month, year, notes } = req.body;

    if (!month || !year) {
      return res.status(400).json({ message: "month and year are required" });
    }

    // Fetch existing profit log
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

    // Recalculate data from the system
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

    // Previous month income
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

    // Update existing profit log
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

    return res
      .status(200)
      .json({ message: "ProfitLog updated successfully", data: updated });
  } catch (error) {
    console.error("Error updating profit log:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

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
        source: "Monthly Profit",
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

export const getAllCashLedgerEntries = async (_: Request, res: Response) => {
  try {
    const entries = await prisma.cashLedger.findMany({
      orderBy: { date: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({ success: true, data: entries });
  } catch (error) {
    console.error("Failed to fetch cash ledger:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching cash ledger data." });
  }
};

// controllers/cashLedgerController.ts

export const createManualLedgerEntry = async (req: Request, res: Response) => {
  const { type, source, amount, method, description } = req.body;
  //@ts-ignore
  const userId = req.user?.useId; // assuming you're using auth middleware to attach user

  if (!type || !source || !amount || !method || !userId) {
    return res.status(400).json({
      message: "Missing required fields",
    });
  }

  try {
    // Get latest balance
    const latestEntry = await prisma.cashLedger.findFirst({
      orderBy: { date: "desc" },
    });

    const currentBalance = latestEntry?.balanceAfter || 0;
    const newBalance =
      type === "DEPOSIT" ? currentBalance + amount : currentBalance - amount;

    const newLedger = await prisma.cashLedger.create({
      data: {
        type,
        source,
        amount,
        method,
        description,
        balanceAfter: newBalance,
        createdById: userId,
      },
    });

    res.status(201).json({
      success: true,
      data: newLedger,
    });
  } catch (error) {
    console.error("Error creating manual ledger:", error);
    res.status(500).json({
      message: "Something went wrong while creating ledger entry",
    });
  }
};

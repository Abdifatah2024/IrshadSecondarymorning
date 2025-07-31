"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createManualLedgerEntry = exports.getAllCashLedgerEntries = exports.createProfitLogAndAutoDeposit = exports.AutoUpdateProfitLog = exports.getProfitLogsByYear = exports.createProfitLogAuto = exports.deleteProfitLog = exports.updateProfitLog = exports.getProfitLogById = exports.getAllProfitLogs = exports.createProfitLog = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// CREATE ProfitLog
const createProfitLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year, closedById, currentIncome, previousIncome, advanceIncome, totalRevenue, totalDiscounts, netRevenue, totalExpenses, totalEmployeeAdvances, netIncome, notes, } = req.body;
        // Check if a record for the same month and year already exists
        const exists = yield prisma.profitLog.findUnique({
            where: { month_year: { month, year } },
        });
        if (exists) {
            return res
                .status(400)
                .json({ message: "ProfitLog for this month and year already exists." });
        }
        const newLog = yield prisma.profitLog.create({
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
    }
    catch (error) {
        console.error("Create ProfitLog error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to create ProfitLog." });
    }
});
exports.createProfitLog = createProfitLog;
// GET all ProfitLogs
const getAllProfitLogs = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const logs = yield prisma.profitLog.findMany({
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
    }
    catch (error) {
        console.error("Fetch ProfitLogs error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch ProfitLogs." });
    }
});
exports.getAllProfitLogs = getAllProfitLogs;
// GET ProfitLog by ID
const getProfitLogById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const log = yield prisma.profitLog.findUnique({
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
        if (!log)
            return res.status(404).json({ message: "ProfitLog not found" });
        res.status(200).json({ success: true, data: log });
    }
    catch (error) {
        console.error("Fetch ProfitLog error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to fetch ProfitLog." });
    }
});
exports.getProfitLogById = getProfitLogById;
// UPDATE ProfitLog
const updateProfitLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const updateData = req.body;
    try {
        const updated = yield prisma.profitLog.update({
            where: { id: Number(id) },
            data: updateData,
        });
        res.status(200).json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Update ProfitLog error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to update ProfitLog." });
    }
});
exports.updateProfitLog = updateProfitLog;
// DELETE ProfitLog
const deleteProfitLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.profitLog.delete({ where: { id: Number(id) } });
        res
            .status(200)
            .json({ success: true, message: "ProfitLog deleted successfully." });
    }
    catch (error) {
        console.error("Delete ProfitLog error:", error);
        res
            .status(500)
            .json({ success: false, message: "Failed to delete ProfitLog." });
    }
});
exports.deleteProfitLog = deleteProfitLog;
// controllers/profitLogController.ts
const createProfitLogAuto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year, closedById, notes } = req.body;
        if (!month || !year || !closedById) {
            return res
                .status(400)
                .json({ message: "month, year, closedById are required" });
        }
        // Check duplicate
        const existing = yield prisma.profitLog.findFirst({
            where: { month, year },
        });
        if (existing) {
            return res
                .status(400)
                .json({ message: "Profit log already exists for this month/year" });
        }
        // Fetch totals from system
        const payments = yield prisma.payment.findMany({
            where: {
                date: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month + 1}-01`),
                },
            },
        });
        const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscounts = payments.reduce((sum, p) => sum + Number(p.discount), 0);
        const netRevenue = totalRevenue - totalDiscounts;
        const expenses = yield prisma.expense.findMany({
            where: {
                date: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month + 1}-01`),
                },
            },
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const advances = yield prisma.employeeAdvance.findMany({
            where: {
                month,
                year,
            },
        });
        const totalAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
        const previousMonth = month === 1 ? 12 : month - 1;
        const previousYear = month === 1 ? year - 1 : year;
        const prevProfit = yield prisma.profitLog.findFirst({
            where: {
                month: previousMonth,
                year: previousYear,
            },
        });
        const previousIncome = (prevProfit === null || prevProfit === void 0 ? void 0 : prevProfit.netIncome) || 0;
        const netIncome = netRevenue - totalExpenses - totalAdvances;
        const profitLog = yield prisma.profitLog.create({
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
    }
    catch (error) {
        console.error("Profit log error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});
exports.createProfitLogAuto = createProfitLogAuto;
const getProfitLogsByYear = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year } = req.params;
    try {
        const logs = yield prisma.profitLog.findMany({
            where: { year: Number(year) },
            orderBy: { month: "asc" },
        });
        res.json({ success: true, logs });
    }
    catch (err) {
        res.status(500).json({ message: "Error fetching year data." });
    }
});
exports.getProfitLogsByYear = getProfitLogsByYear;
// controllers/profitLogController.ts
const AutoUpdateProfitLog = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { month, year, notes } = req.body;
        if (!month || !year) {
            return res.status(400).json({ message: "month and year are required" });
        }
        // Fetch existing profit log
        const existing = yield prisma.profitLog.findUnique({
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
        const payments = yield prisma.payment.findMany({
            where: {
                date: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month + 1}-01`),
                },
            },
        });
        const currentIncome = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscounts = payments.reduce((sum, p) => sum + Number(p.discount), 0);
        // Previous month income
        let previousIncome = 0;
        const prev = yield prisma.profitLog.findUnique({
            where: {
                month_year: {
                    month: month === 1 ? 12 : month - 1,
                    year: month === 1 ? year - 1 : year,
                },
            },
        });
        if (prev)
            previousIncome = prev.currentIncome;
        const expenses = yield prisma.expense.findMany({
            where: {
                date: {
                    gte: new Date(`${year}-${month}-01`),
                    lt: new Date(`${year}-${month + 1}-01`),
                },
            },
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
        });
        const totalEmployeeAdvances = advances.reduce((sum, a) => sum + a.amount, 0);
        const advanceIncome = 0;
        const totalRevenue = currentIncome + advanceIncome;
        const netRevenue = totalRevenue - totalDiscounts;
        const netIncome = netRevenue - totalExpenses - totalEmployeeAdvances;
        // Update existing profit log
        const updated = yield prisma.profitLog.update({
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
    }
    catch (error) {
        console.error("Error updating profit log:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.AutoUpdateProfitLog = AutoUpdateProfitLog;
const createProfitLogAndAutoDeposit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { month, year, currentIncome, previousIncome, advanceIncome, totalRevenue, totalDiscounts, netRevenue, totalExpenses, totalEmployeeAdvances, netIncome, notes, } = req.body;
    //@ts-ignore
    const userId = req.body.userId || ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id);
    if (!month || !year || userId === undefined) {
        return res
            .status(400)
            .json({ message: "Month, year, and user ID are required" });
    }
    try {
        // Check for duplicate
        const existing = yield prisma.profitLog.findUnique({
            where: { month_year: { month, year } },
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: "ProfitLog for this month already exists" });
        }
        // Create ProfitLog
        const profitLog = yield prisma.profitLog.create({
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
        const lastLedger = yield prisma.cashLedger.findFirst({
            orderBy: { id: "desc" },
        });
        const previousBalance = (lastLedger === null || lastLedger === void 0 ? void 0 : lastLedger.balanceAfter) || 0;
        // Determine type and create ledger entry
        const transactionType = netIncome >= 0 ? "DEPOSIT" : "WITHDRAWAL";
        const absoluteAmount = Math.abs(netIncome);
        const newBalance = transactionType === "DEPOSIT"
            ? previousBalance + absoluteAmount
            : previousBalance - absoluteAmount;
        yield prisma.cashLedger.create({
            data: {
                date: new Date(),
                type: transactionType,
                source: "Monthly Profit",
                referenceId: profitLog.id,
                amount: absoluteAmount,
                method: "Bank", // or "Cash", make configurable if needed
                description: transactionType === "DEPOSIT"
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
    }
    catch (error) {
        console.error("Profit log creation failed:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.createProfitLogAndAutoDeposit = createProfitLogAndAutoDeposit;
const getAllCashLedgerEntries = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const entries = yield prisma.cashLedger.findMany({
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
    }
    catch (error) {
        console.error("Failed to fetch cash ledger:", error);
        res
            .status(500)
            .json({ success: false, message: "Error fetching cash ledger data." });
    }
});
exports.getAllCashLedgerEntries = getAllCashLedgerEntries;
// controllers/cashLedgerController.ts
const createManualLedgerEntry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { type, source, amount, method, description } = req.body;
    //@ts-ignore
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId; // assuming you're using auth middleware to attach user
    if (!type || !source || !amount || !method || !userId) {
        return res.status(400).json({
            message: "Missing required fields",
        });
    }
    try {
        // Get latest balance
        const latestEntry = yield prisma.cashLedger.findFirst({
            orderBy: { date: "desc" },
        });
        const currentBalance = (latestEntry === null || latestEntry === void 0 ? void 0 : latestEntry.balanceAfter) || 0;
        const newBalance = type === "DEPOSIT" ? currentBalance + amount : currentBalance - amount;
        const newLedger = yield prisma.cashLedger.create({
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
    }
    catch (error) {
        console.error("Error creating manual ledger:", error);
        res.status(500).json({
            message: "Something went wrong while creating ledger entry",
        });
    }
});
exports.createManualLedgerEntry = createManualLedgerEntry;

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
exports.getExpenseSummary = exports.getMonthlyBalance = exports.deleteExpense = exports.updateExpense = exports.getExpenseById = exports.getExpenses = exports.createExpense = void 0;
const client_1 = require("@prisma/client");
const finance_1 = require("../prisma/utlis/utils/finance");
const prisma = new client_1.PrismaClient();
const createExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { category, amount, date, paymentMethod, description, approvedBy } = req.body;
        //@ts-ignore
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        const expenseDate = new Date(date);
        const month = expenseDate.getMonth() + 1;
        const year = expenseDate.getFullYear();
        if (!category || !amount || amount <= 0 || !paymentMethod || !date) {
            return res.status(400).json({ message: "Invalid fields." });
        }
        // ✅ New: Block expenses not in current month/year
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (month !== currentMonth || year !== currentYear) {
            return res.status(400).json({
                message: "Expenses can only be created for the current month and year.",
                currentMonth,
                currentYear,
                attempted: { month, year },
            });
        }
        const financials = yield (0, finance_1.getMonthlyFinancialStatus)(month, year, prisma);
        if (amount > financials.remaining) {
            return res.status(400).json({
                message: `Cannot create expense. Remaining balance: $${financials.remaining}`,
            });
        }
        const expense = yield prisma.expense.create({
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});
exports.createExpense = createExpense;
const getExpenses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const expenses = yield prisma.expense.findMany({
            orderBy: { date: "desc" },
            include: {
                user: { select: { fullName: true, email: true } },
            },
        });
        res.status(200).json({ count: expenses.length, expenses });
    }
    catch (error) {
        console.error("Error fetching expenses:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenses = getExpenses;
const getExpenseById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const expense = yield prisma.expense.findUnique({
            where: { id },
            include: { user: { select: { fullName: true } } },
        });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found" });
        }
        res.status(200).json({ expense });
    }
    catch (error) {
        console.error("Error fetching expense:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenseById = getExpenseById;
const updateExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { category, amount, date, description, paymentMethod, approvedBy, receiptUrl, } = req.body;
        const existing = yield prisma.expense.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Expense not found" });
        }
        if (!category || !amount || amount <= 0 || !paymentMethod || !date) {
            return res.status(400).json({ message: "Invalid input fields" });
        }
        // ✅ Check for current month/year only
        const newDate = new Date(date);
        const inputMonth = newDate.getMonth() + 1;
        const inputYear = newDate.getFullYear();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (inputMonth !== currentMonth || inputYear !== currentYear) {
            return res.status(400).json({
                message: "You can only update expenses to the current month and year.",
                currentMonth,
                currentYear,
                attempted: { inputMonth, inputYear },
            });
        }
        const updated = yield prisma.expense.update({
            where: { id },
            data: {
                category,
                amount,
                date: newDate,
                description,
                paymentMethod,
                approvedBy,
                receiptUrl,
            },
        });
        res.status(200).json({ message: "Expense updated", expense: updated });
    }
    catch (error) {
        console.error("Error updating expense:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateExpense = updateExpense;
const deleteExpense = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const existing = yield prisma.expense.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ message: "Expense not found" });
        }
        // ✅ Only allow deletion if expense date is in current month/year
        const expenseDate = new Date(existing.date);
        const expenseMonth = expenseDate.getMonth() + 1;
        const expenseYear = expenseDate.getFullYear();
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        if (expenseMonth !== currentMonth || expenseYear !== currentYear) {
            return res.status(400).json({
                message: "You can only delete expenses from the current month and year.",
                currentMonth,
                currentYear,
                attempted: { expenseMonth, expenseYear },
            });
        }
        yield prisma.expense.delete({ where: { id } });
        res.status(200).json({ message: "Expense deleted", deletedId: id });
    }
    catch (error) {
        console.error("Error deleting expense:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteExpense = deleteExpense;
const getMonthlyBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        if (!month || !year) {
            return res.status(400).json({ message: "Month and Year are required." });
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // ✅ Total income = amountPaid only
        const payments = yield prisma.payment.findMany({
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
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
            select: { amount: true },
        });
        const totalAdvance = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
        // ✅ Total expense
        const expenses = yield prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: { amount: true },
        });
        const totalExpense = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
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
    }
    catch (error) {
        console.error("Error calculating balance:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getMonthlyBalance = getMonthlyBalance;
const getExpenseSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        if (!month || !year) {
            return res.status(400).json({ message: "Month and Year are required" });
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // Fetch standard expenses
        const expenses = yield prisma.expense.findMany({
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
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
            select: { amount: true },
        });
        const summaryMap = {};
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
        const categorySummary = Object.entries(summaryMap).map(([category, amount]) => ({
            category,
            amount,
        }));
        return res.status(200).json({
            month,
            year,
            totalExpenses: total,
            categorySummary,
        });
    }
    catch (error) {
        console.error("Error generating expense summary:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExpenseSummary = getExpenseSummary;

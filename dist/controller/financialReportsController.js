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
exports.getTodayIncome = exports.getCombinedPayments = exports.getStudentsWithUnpaidFeesOrBalance = exports.getCashFlowStatement = exports.getBalanceSheet = exports.getIncomeStatement = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Income Statement: Revenue - Discounts - Advances - Expenses = Net Income
// export const getIncomeStatement = async (req: Request, res: Response) => {
//   try {
//     const month = Number(req.query.month);
//     const year = Number(req.query.year);
//     if (!month || !year) {
//       return res.status(400).json({ message: "Month and year are required." });
//     }
//     const startDate = new Date(year, month - 1, 1);
//     const endDate = new Date(year, month, 0, 23, 59, 59, 999);
//     const payments = await prisma.payment.findMany({
//       where: { date: { gte: startDate, lte: endDate } },
//       select: { amountPaid: true, discount: true },
//     });
//     const totalRevenue = payments.reduce(
//       (sum, p) => sum + Number(p.amountPaid),
//       0
//     );
//     const totalDiscounts = payments.reduce(
//       (sum, p) => sum + Number(p.discount),
//       0
//     );
//     const advances = await prisma.employeeAdvance.findMany({
//       where: { month, year },
//       select: { amount: true },
//     });
//     const totalAdvances = advances.reduce(
//       (sum, a) => sum + Number(a.amount),
//       0
//     );
//     const expenses = await prisma.expense.findMany({
//       where: { date: { gte: startDate, lte: endDate } },
//       select: { amount: true },
//     });
//     const totalExpenses = expenses.reduce(
//       (sum, e) => sum + Number(e.amount),
//       0
//     );
//     const netRevenue = totalRevenue - totalDiscounts;
//     const netIncome = netRevenue - totalAdvances - totalExpenses;
//     res.status(200).json({
//       month,
//       year,
//       totalRevenue,
//       totalDiscounts,
//       netRevenue,
//       totalAdvances,
//       totalExpenses,
//       netIncome,
//     });
//   } catch (error) {
//     console.error("Error generating income statement:", error);
//     res.status(500).json({ message: "Internal server error." });
//   }
// };
const getIncomeStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required." });
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // Fetch payments (includes amountPaid and discount)
        const payments = yield prisma.payment.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            select: { amountPaid: true, discount: true },
        });
        const netRevenue = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscounts = payments.reduce((sum, p) => sum + Number(p.discount || 0), 0);
        const totalRevenue = netRevenue + totalDiscounts; // ✅ as per your requirement
        // Fetch employee advances
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
            select: { amount: true },
        });
        const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        // Fetch expenses
        const expenses = yield prisma.expense.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            select: { amount: true },
        });
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const netIncome = netRevenue - totalAdvances - totalExpenses;
        res.status(200).json({
            month,
            year,
            totalRevenue, // = netRevenue + discount
            totalDiscounts,
            netRevenue, // only amountPaid
            totalAdvances,
            totalExpenses,
            netIncome,
        });
    }
    catch (error) {
        console.error("Error generating income statement:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
exports.getIncomeStatement = getIncomeStatement;
// Balance Sheet: Assets = Carry Forward, Liabilities = Unpaid Fees, Equity = A - L
const getBalanceSheet = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const students = yield prisma.student.findMany({
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
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            totalAssets += carryForward;
            for (const fee of student.StudentFee) {
                const paid = fee.PaymentAllocation.reduce((sum, a) => sum + Number(a.amount), 0);
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
    }
    catch (error) {
        console.error("Error generating balance sheet:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
exports.getBalanceSheet = getBalanceSheet;
// Cash Flow Report: Cash In = Payments; Cash Out = Advances + Expenses
const getCashFlowStatement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = Number(req.query.month);
        const year = Number(req.query.year);
        if (!month || !year) {
            return res.status(400).json({ message: "Month and year are required." });
        }
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // ✅ Only summing actual amountPaid — no discount
        const payments = yield prisma.payment.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            select: { amountPaid: true },
        });
        const cashInflow = payments.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
            select: { amount: true },
        });
        const advanceOutflow = advances.reduce((sum, a) => sum + Number(a.amount), 0);
        const expenses = yield prisma.expense.findMany({
            where: { date: { gte: startDate, lte: endDate } },
            select: { amount: true },
        });
        const expenseOutflow = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const netCashFlow = cashInflow - (advanceOutflow + expenseOutflow);
        res.status(200).json({
            month,
            year,
            cashInflow,
            advanceOutflow,
            expenseOutflow,
            netCashFlow,
        });
    }
    catch (error) {
        console.error("Error generating cash flow:", error);
        res.status(500).json({ message: "Internal server error." });
    }
});
exports.getCashFlowStatement = getCashFlowStatement;
const getStudentsWithUnpaidFeesOrBalance = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const students = yield prisma.student.findMany({
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
                const paidForThisMonth = fee.PaymentAllocation.reduce((sum, alloc) => sum + Number(alloc.amount), 0);
                totalPaid += paidForThisMonth;
                totalRequired += feeAmount;
                if (!fee.isPaid && paidForThisMonth < feeAmount) {
                    unpaidMonths++;
                }
            }
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
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
    }
    catch (error) {
        console.error("Error calculating balances:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getStudentsWithUnpaidFeesOrBalance = getStudentsWithUnpaidFeesOrBalance;
const getCombinedPayments = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const payments = yield prisma.payment.findMany({
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
    }
    catch (error) {
        console.error("Error fetching combined payments:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getCombinedPayments = getCombinedPayments;
const getTodayIncome = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const today = new Date();
        const startDate = new Date(today.setHours(0, 0, 0, 0));
        const endDate = new Date(today.setHours(23, 59, 59, 999));
        const paymentsToday = yield prisma.payment.findMany({
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
        const amountPaidToday = paymentsToday.reduce((sum, p) => sum + Number(p.amountPaid), 0);
        const totalDiscountToday = paymentsToday.reduce((sum, p) => sum + Number(p.discount), 0);
        const unpaidFees = yield prisma.studentFee.findMany({
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
            const paid = fee.PaymentAllocation.reduce((s, a) => s + Number(a.amount), 0);
            return sum + Math.max(0, expected - paid);
        }, 0);
        res.status(200).json({
            date: new Date().toISOString().split("T")[0],
            amountPaidToday,
            totalDiscountToday,
            unpaidBalance,
        });
    }
    catch (error) {
        console.error("Error fetching today's payment summary:", error);
        res.status(500).json({
            message: "Internal server error",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getTodayIncome = getTodayIncome;

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
exports.getMonthlyFinancialStatus = getMonthlyFinancialStatus;
function getMonthlyFinancialStatus(month, year, prisma) {
    return __awaiter(this, void 0, void 0, function* () {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59, 999);
        // 1. Get Total Income (from payment.amountPaid)
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
            return sum + Number(p.amountPaid || 0);
        }, 0);
        // 2. Get Total Advances
        const advances = yield prisma.employeeAdvance.findMany({
            where: { month, year },
            select: { amount: true },
        });
        const totalAdvance = advances.reduce((sum, adv) => {
            return sum + Number(adv.amount);
        }, 0);
        // 3. Get Total Expenses
        const expenses = yield prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: { amount: true },
        });
        const totalExpense = expenses.reduce((sum, exp) => {
            return sum + Number(exp.amount);
        }, 0);
        // 4. Compute remaining
        const used = totalAdvance + totalExpense;
        const remaining = totalIncome - used;
        return {
            totalIncome,
            totalAdvance,
            totalExpense,
            used,
            remaining,
        };
    });
}

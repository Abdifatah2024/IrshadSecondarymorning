"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/financialReports.ts
const express_1 = require("express");
const financialReportsController_1 = require("../controller/financialReportsController");
const router = (0, express_1.Router)();
// Standard Financial Reports
router.get("/income-statement", financialReportsController_1.getIncomeStatement); // /api/financial/income-statement
router.get("/balance-sheet", financialReportsController_1.getBalanceSheet); // /api/financial/balance-sheet
router.get("/cash-flow", financialReportsController_1.getCashFlowStatement); // /api/financial/cash-flow
// Existing Reports
router.get("/unpaid-summary", financialReportsController_1.getStudentsWithUnpaidFeesOrBalance); // /api/financial/unpaid-summary
router.get("/monthly-summary", financialReportsController_1.getCombinedPayments); // /api/financial/monthly-summary
router.get("/today-income", financialReportsController_1.getTodayIncome); // /api/financial/today-income
exports.default = router;

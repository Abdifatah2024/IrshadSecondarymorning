// routes/financialReports.ts
import { Router } from "express";
import {
  getIncomeStatement,
  getBalanceSheet,
  getCashFlowStatement,
  getStudentsWithUnpaidFeesOrBalance,
  getCombinedPayments,
  getTodayIncome,
} from "../controller/financialReportsController";

const router = Router();

// Standard Financial Reports
router.get("/income-statement", getIncomeStatement); // /api/financial/income-statement
router.get("/balance-sheet", getBalanceSheet); // /api/financial/balance-sheet
router.get("/cash-flow", getCashFlowStatement); // /api/financial/cash-flow

// Existing Reports
router.get("/unpaid-summary", getStudentsWithUnpaidFeesOrBalance); // /api/financial/unpaid-summary
router.get("/monthly-summary", getCombinedPayments); // /api/financial/monthly-summary
router.get("/today-income", getTodayIncome); // /api/financial/today-income

export default router;

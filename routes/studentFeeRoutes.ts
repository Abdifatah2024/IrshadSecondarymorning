import express from "express";
import {
  generateMonthlyFees,
  createStudentPayment,
  getStudentFees,
  getPaymentHistory,
  getStudentBalanceSummary,
  getAllocationsByPayment,
  getAllPaymentAllocations,
  getFeeInconsistencies,
  verifyDiscount,
  listDiscounts,
  getStudentsWithUnpaidFeesOrBalance,
  getMonthlyIncomeOverview,
  deleteStudentFeesByMonth,
  getAllGeneratedMonths,
  getStudentDepositStatus,
  getAllStudentAccountSummaries,
  getCombinedPayments,
} from "../controller/PaymentContorller";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

// Generate monthly fees for all studentss
router.get("/students/balance-summaries", getAllStudentAccountSummaries);

router.post("/generate-monthly-fees", generateMonthlyFees);
router.get("/StudentWithBalance", getStudentsWithUnpaidFeesOrBalance);
// Get all fees for a student (by ID)
router.get("/students/:id", getStudentFees);

// Create a payment for a student
router.post("/payment", authenticate, createStudentPayment);

router.get("/payment/:studentId/history", getPaymentHistory);
router.get("/students/:id/balance", getStudentBalanceSummary);
router.get("/Allocation/:id", getAllocationsByPayment);
router.get("/payment-allocations", getAllPaymentAllocations);
router.get("/admin/fee-inconsistencies", getFeeInconsistencies);
router.post("/discounts/verify", verifyDiscount);
router.post("/discounts/list", listDiscounts);
router.get("/income-required", getMonthlyIncomeOverview);
router.delete("/delete-student-fees", deleteStudentFeesByMonth);
router.get("/months-generated", getAllGeneratedMonths);
router.get("/students/:id/deposit-status", getStudentDepositStatus);
router.get("/payments/combined", getCombinedPayments);

export default router;

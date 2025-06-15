import express from "express";
import {
  generateMonthlyFees,
  createStudentPayment,
  getStudentFees,
  getPaymentHistory,
  getStudentBalanceSummary,
  getAllocationsByPayment,
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
  getTodayIncome,
  getStudentsWithUnpaidFeeMonthly,
  createMultiStudentPayment,
  getAllDiscountLogs,
  getAllPayments,
  updatePayment,
  getFamilyBalanceByPhone,
  payStudentMonth,
  payFullForMonthByPhone,
  checkIfPaymentNumberAlreadyUsed,
  checkLastPaymentByNumber,
} from "../controller/PaymentContorller";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

// Generate monthly fees for all studentss
router.get("/students/balance-summaries", getAllStudentAccountSummaries);

router.post("/generate-monthly-fees", generateMonthlyFees);
router.get("/StudentWithBalance", getStudentsWithUnpaidFeesOrBalance);
// Get all fees for a student (by ID)
router.get("/students/:id", getStudentFees);
router.get("/discounts", getAllDiscountLogs);

// Create a payment for a student
router.post("/payment", authenticate, createStudentPayment);
router.post("/payment/multi", authenticate, createMultiStudentPayment);

router.get("/payment/:studentId/history", getPaymentHistory);
router.get("/students/:id/balance", getStudentBalanceSummary);
router.get("/Allocation/:id", getAllocationsByPayment);
router.get("/payments", getAllPayments);

// Route to update a specific payment by ID
router.put("/payments/:id", updatePayment);
router.get("/admin/fee-inconsistencies", getFeeInconsistencies);
router.post("/discounts/verify", verifyDiscount);
router.post("/discounts/list", listDiscounts);
router.get("/income-required", getMonthlyIncomeOverview);
router.delete("/delete-student-fees", deleteStudentFeesByMonth);
router.get("/months-generated", getAllGeneratedMonths);
router.get("/students/:id/deposit-status", getStudentDepositStatus);
router.get("/payments/combined", getCombinedPayments);
router.get("/income/today", getTodayIncome);
router.get("/Classfee/status", getStudentsWithUnpaidFeeMonthly);
router.get("/family/balance", getFamilyBalanceByPhone);
router.post("/pay/month", authenticate, payStudentMonth);
router.post("/pay-full-month", authenticate, payFullForMonthByPhone);
router.post("/check-payment-number", checkIfPaymentNumberAlreadyUsed);
router.post("/payment/check-last-used-number", checkLastPaymentByNumber);

export default router;

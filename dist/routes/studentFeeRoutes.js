"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const PaymentContorller_1 = require("../controller/PaymentContorller");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = express_1.default.Router();
// Generate monthly fees for all studentss
router.get("/students/balance-summaries", PaymentContorller_1.getAllStudentAccountSummaries);
router.get("/students/search", PaymentContorller_1.searchStudentsByNameOrId);
router.post("/generate-monthly-fees", PaymentContorller_1.generateMonthlyFees);
router.get("/StudentWithBalance", PaymentContorller_1.getStudentsWithUnpaidFeesOrBalance);
// Get all fees for a student (by ID)
router.get("/students/:id", PaymentContorller_1.getStudentFees);
router.get("/discounts", PaymentContorller_1.getAllDiscountLogs);
// Create a payment for a student
router.post("/payment", authaniticator_1.authenticate, PaymentContorller_1.createStudentPayment);
router.post("/payment/multi", authaniticator_1.authenticate, PaymentContorller_1.createMultiStudentPayment);
router.get("/payment/:studentId/history", PaymentContorller_1.getPaymentHistory);
router.get("/students/:id/balance", PaymentContorller_1.getStudentBalanceSummary);
router.get("/Allocation/:id", PaymentContorller_1.getAllocationsByPayment);
router.get("/payments", PaymentContorller_1.getAllPayments);
// Route to update a specific payment by ID
router.put("/payments/:id", PaymentContorller_1.updatePayment);
router.get("/admin/fee-inconsistencies", PaymentContorller_1.getFeeInconsistencies);
router.post("/discounts/verify", PaymentContorller_1.verifyDiscount);
router.post("/discounts/list", PaymentContorller_1.listDiscounts);
router.get("/income-required", PaymentContorller_1.getMonthlyIncomeOverview);
router.delete("/delete-student-fees", PaymentContorller_1.deleteStudentFeesByMonth);
router.get("/months-generated", PaymentContorller_1.getAllGeneratedMonths);
router.get("/students/:id/deposit-status", PaymentContorller_1.getStudentDepositStatus);
router.get("/payments/combined", PaymentContorller_1.getCombinedPayments);
router.get("/income/today", PaymentContorller_1.getTodayIncome);
router.get("/Classfee/status", PaymentContorller_1.getStudentsWithUnpaidFeeMonthly);
router.get("/family/balance", PaymentContorller_1.getFamilyBalanceByPhone);
router.post("/pay/month", authaniticator_1.authenticate, PaymentContorller_1.payStudentMonth);
router.post("/pay-full-month", authaniticator_1.authenticate, PaymentContorller_1.payFullForMonthByPhone);
router.post("/check-payment-number", PaymentContorller_1.checkIfPaymentNumberAlreadyUsed);
router.post("/payment/check-last-used-number", PaymentContorller_1.checkLastPaymentByNumber);
router.post("/payment/student", authaniticator_1.authenticate, PaymentContorller_1.payFullForMonthByStudent);
router.get("/payments/collection-summary", PaymentContorller_1.getUserPaymentCollections);
router.post("/payments/by-student", PaymentContorller_1.getAllPaymentsByStudentId);
router.get("/GetStudent/Balance/Month", PaymentContorller_1.getStudentsWithBalancesAndDueMonths);
exports.default = router;

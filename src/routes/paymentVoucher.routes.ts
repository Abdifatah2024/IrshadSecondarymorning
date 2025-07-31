import express from "express";
import {
  listVouchers,
  getVoucherById,
  updatePaymentVoucher,
  listMonthlyVoucherGroups,
  fetchLastGlobalPayment,
} from "../controller/paymentVoucher.controller";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

router.get("/vouchers", listVouchers);
router.get("/vouchers/:id", getVoucherById);
router.put("/payments/:id", authenticate, updatePaymentVoucher);
router.get("/vouchers/monthly/grouped", listMonthlyVoucherGroups);
router.get("/payment/last", fetchLastGlobalPayment);

export default router;

import express from "express";
import {
  listVouchers,
  getVoucherById,
  updatePaymentVoucher,
  listMonthlyVoucherGroups,
} from "../controller/paymentVoucher.controller";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

router.get("/vouchers", listVouchers);
router.get("/vouchers/:id", getVoucherById);
router.put("/payments/:id", authenticate, updatePaymentVoucher);
router.get("/vouchers/monthly/grouped", listMonthlyVoucherGroups);

export default router;

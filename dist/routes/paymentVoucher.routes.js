"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentVoucher_controller_1 = require("../controller/paymentVoucher.controller");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = express_1.default.Router();
router.get("/vouchers", paymentVoucher_controller_1.listVouchers);
router.get("/vouchers/:id", paymentVoucher_controller_1.getVoucherById);
router.put("/payments/:id", authaniticator_1.authenticate, paymentVoucher_controller_1.updatePaymentVoucher);
router.get("/vouchers/monthly/grouped", paymentVoucher_controller_1.listMonthlyVoucherGroups);
router.get("/payment/last", paymentVoucher_controller_1.fetchLastGlobalPayment);
exports.default = router;

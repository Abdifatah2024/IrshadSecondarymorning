"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const discountLimit_controller_1 = require("../controller/discountLimit.controller");
const router = express_1.default.Router();
router.post("/", discountLimit_controller_1.setMonthlyDiscountLimit); // create
router.get("/:month/:year", discountLimit_controller_1.getMonthlyDiscountLimit); // get one
router.put("/:month/:year", discountLimit_controller_1.updateMonthlyDiscountLimit); // update
// routes/discountLimitRoutes.ts
router.post("/seed-all-months", discountLimit_controller_1.seedAllMonths);
exports.default = router;

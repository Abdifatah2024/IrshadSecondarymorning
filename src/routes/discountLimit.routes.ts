import express from "express";
import {
  setMonthlyDiscountLimit,
  getMonthlyDiscountLimit,
  updateMonthlyDiscountLimit,
  seedAllMonths,
} from "../controller/discountLimit.controller";

const router = express.Router();

router.post("/", setMonthlyDiscountLimit); // create
router.get("/:month/:year", getMonthlyDiscountLimit); // get one
router.put("/:month/:year", updateMonthlyDiscountLimit); // update
// routes/discountLimitRoutes.ts
router.post("/seed-all-months", seedAllMonths);

export default router;

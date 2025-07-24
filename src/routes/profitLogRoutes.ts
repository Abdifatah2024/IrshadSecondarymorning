// routes/profitLogRoutes.ts
import express from "express";
import {
  autoCreateProfitLogAndDeposit,
  createProfitLogAndAutoDeposit,
} from "../controller/Ledeger.Controller";
import { authenticate } from "../middlewares/authaniticator";
import { createProfitLog } from "../controller/profitLogController";

const router = express.Router();

router.post("/profitlogs", authenticate, createProfitLogAndAutoDeposit);
router.post("/create", authenticate, createProfitLog);
router.post("/auto-create", authenticate, autoCreateProfitLogAndDeposit);

export default router;

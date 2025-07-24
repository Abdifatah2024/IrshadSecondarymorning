import express from "express";
import {
  createProfitLog,
  getAllProfitLogs,
  getProfitLogById,
  updateProfitLog,
  deleteProfitLog,
  createProfitLogAuto,
  getProfitLogsByYear,
  AutoUpdateProfitLog,
  createProfitLogAndAutoDeposit,
  getAllCashLedgerEntries,
  createManualLedgerEntry,
} from "../controller/profitLogController";
import { authenticate } from "../middlewares/authaniticator";
import { autoCreateProfitLogAndDeposit } from "../controller/Ledeger.Controller";

const router = express.Router();
router.get("/byYear/:year", getProfitLogsByYear);
router.post("/profitLogs", createProfitLog);
router.get("/profitLogs", getAllProfitLogs);

router.get("/profitLogs/:id", getProfitLogById);
router.put("/profitLogs/:id", updateProfitLog);
router.delete("/profitLogs/:id", deleteProfitLog);
router.post("/auto", createProfitLogAuto);
router.put("/update", AutoUpdateProfitLog);
router.post("/profitlogs", authenticate, createProfitLogAndAutoDeposit);
router.post("/create", authenticate, createProfitLog);
router.post("/auto-create", authenticate, autoCreateProfitLogAndDeposit);
router.get("/cash-ledger", getAllCashLedgerEntries);
router.post("/manual-ledger", authenticate, createManualLedgerEntry);

export default router;

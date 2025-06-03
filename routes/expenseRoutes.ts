import { Router } from "express";
// routes/expenseRoutes.ts
import express from "express";
import {
  createExpense,
  getExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getMonthlyBalance,
} from "../controller/Expenses.Controller";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

router.post("/create", authenticate, createExpense); // ➕ Create
router.get("/", getExpenses); // 📥 List all
router.get("/:id", getExpenseById); // 🔍 Get one
router.put("/:id", updateExpense); // ✏️ Update
router.delete("/:id", deleteExpense); // ❌ Delete
router.get("/balance/monthly", authenticate, getMonthlyBalance);

export default router;

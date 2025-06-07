"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/expenseRoutes.ts
const express_1 = __importDefault(require("express"));
const Expenses_Controller_1 = require("../controller/Expenses.Controller");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = express_1.default.Router();
router.get("/summary", Expenses_Controller_1.getExpenseSummary);
router.post("/create", authaniticator_1.authenticate, Expenses_Controller_1.createExpense); // ➕ Create
router.get("/", Expenses_Controller_1.getExpenses); // 📥 List all
router.get("/:id", Expenses_Controller_1.getExpenseById); // 🔍 Get one
router.put("/:id", Expenses_Controller_1.updateExpense); // ✏️ Update
router.delete("/:id", Expenses_Controller_1.deleteExpense); // ❌ Delete
router.get("/balance/monthly", authaniticator_1.authenticate, Expenses_Controller_1.getMonthlyBalance);
exports.default = router;

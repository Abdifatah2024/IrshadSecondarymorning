import { Router } from "express";
import {
  createEmployeeAdvanceAndUpdateIncome,
  deleteEmployeeAdvance,
  getAllEmployeesAdnace,
  getEmployeeAdvances,
  getEmployeeAdvancesDetail,
  getEmployeeSalaryAdvanceBalance,
  getMonthlyIncomeOverview,
  updateEmployeeAdvance,
} from "../controller/EmployeeAdvace.controller";
import { authenticate } from "../middlewares/authaniticator";

const router = Router();
// Controllers
router.post(
  "/employees/:id/advance-and-update-income",
  authenticate,
  createEmployeeAdvanceAndUpdateIncome
);
router.get("/employee-advances", authenticate, getEmployeeAdvances);
router.get("/income/monthly", authenticate, getMonthlyIncomeOverview);
router.put("/employee-advances/:id", authenticate, updateEmployeeAdvance);

// ✅ Delete a specific advance
// DELETE /api/employee-advances/:id
router.delete("/employee-advances/:id", authenticate, deleteEmployeeAdvance);
router.get("/employee-balance", getEmployeeSalaryAdvanceBalance);
router.get("/All/employee-balance", getAllEmployeesAdnace);
router.get("/employee-advanceDetail", getEmployeeAdvancesDetail);
export default router;

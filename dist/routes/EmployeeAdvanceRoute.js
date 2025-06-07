"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const EmployeeAdvace_controller_1 = require("../controller/EmployeeAdvace.controller");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = (0, express_1.Router)();
// Controllers
router.post("/employees/:id/advance-and-update-income", authaniticator_1.authenticate, EmployeeAdvace_controller_1.createEmployeeAdvanceAndUpdateIncome);
router.get("/employee-advances", authaniticator_1.authenticate, EmployeeAdvace_controller_1.getEmployeeAdvances);
router.get("/income/monthly", authaniticator_1.authenticate, EmployeeAdvace_controller_1.getMonthlyIncomeOverview);
router.put("/employee-advances/:id", authaniticator_1.authenticate, EmployeeAdvace_controller_1.updateEmployeeAdvance);
// ✅ Delete a specific advance
// DELETE /api/employee-advances/:id
router.delete("/employee-advances/:id", authaniticator_1.authenticate, EmployeeAdvace_controller_1.deleteEmployeeAdvance);
router.get("/employee-balance", EmployeeAdvace_controller_1.getEmployeeSalaryAdvanceBalance);
exports.default = router;

import express from "express";
import {
  markEmployeeAttendance,
  markEmployeeViaFingerprint,
  getAllEmployeeAttendances,
  getEmployeeAttendanceById,
  updateEmployeeAttendance,
  deleteEmployeeAttendance,
  generateEmployeeAttendanceReport,
  generateYearlyEmployeeAttendanceSummary,
} from "../controller/employeeAttendanceController";

const router = express.Router();
router.get("/employee-report", generateEmployeeAttendanceReport);
router.get("/yearly-summary", generateYearlyEmployeeAttendanceSummary);
router.post("/", markEmployeeAttendance); // Manual
router.post("/fingerprint", markEmployeeViaFingerprint); // Fingerprint
router.get("/", getAllEmployeeAttendances); // All
router.get("/:id", getEmployeeAttendanceById); // By ID
router.put("/:id", updateEmployeeAttendance); // Update
router.delete("/:id", deleteEmployeeAttendance); // Delete

export default router;

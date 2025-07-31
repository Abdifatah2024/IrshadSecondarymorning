"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const employeeAttendanceController_1 = require("../controller/employeeAttendanceController");
const router = express_1.default.Router();
router.get("/employee-report", employeeAttendanceController_1.generateEmployeeAttendanceReport);
router.get("/yearly-summary", employeeAttendanceController_1.generateYearlyEmployeeAttendanceSummary);
router.post("/", employeeAttendanceController_1.markEmployeeAttendance); // Manual
router.post("/fingerprint", employeeAttendanceController_1.markEmployeeViaFingerprint); // Fingerprint
router.get("/", employeeAttendanceController_1.getAllEmployeeAttendances); // All
router.get("/:id", employeeAttendanceController_1.getEmployeeAttendanceById); // By ID
router.put("/:id", employeeAttendanceController_1.updateEmployeeAttendance); // Update
router.delete("/:id", employeeAttendanceController_1.deleteEmployeeAttendance); // Delete
exports.default = router;

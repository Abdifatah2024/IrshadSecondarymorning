"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Middlewares
const authaniticator_1 = require("../middlewares/authaniticator");
const autharize_1 = require("../middlewares/autharize");
// Controllers
const StudentsRegister_1 = require("../controller/StudentsRegister");
const router = (0, express_1.Router)();
/* ----------------------------- Student CRUD ----------------------------- */
router.post("/create", authaniticator_1.authenticate, StudentsRegister_1.createStudent);
router.post("/createMultiple", authaniticator_1.authenticate, StudentsRegister_1.createMultipleStudents);
router.post("/upload-excel", StudentsRegister_1.upload.single("file"), authaniticator_1.authenticate, StudentsRegister_1.createMultipleStudentsByExcel);
router.put("/updateClass", authaniticator_1.authenticate, StudentsRegister_1.updateStudentClass);
router.put("/updateClass", authaniticator_1.authenticate, StudentsRegister_1.updateStudentClass);
router.put("/:id", authaniticator_1.authenticate, StudentsRegister_1.updateStudent);
router.post("/students/delete-range-permanent", StudentsRegister_1.deleteMultipleStudentsPermanently);
/* ----------------------------- Class Routes ----------------------------- */
router.post("/createclass", authaniticator_1.authenticate, (0, autharize_1.authorize)("ADMIN"), StudentsRegister_1.createclass);
router.get("/classListStd", StudentsRegister_1.getClasses);
router.get("/ClassList/:classId", StudentsRegister_1.getStudentsByClass);
/* ----------------------------- Student List ----------------------------- */
router.get("/studentList", StudentsRegister_1.getStudents);
/* ----------------------------- Attendance Routes ----------------------------- */
router.get("/attedencelist/:id", StudentsRegister_1.getAttendance);
router.get("/absentees", StudentsRegister_1.getAllAbsenteesByDate);
router.get("/attendance/top-absent", StudentsRegister_1.getTopAbsentStudents);
router.post("/attendance/fingerprint", StudentsRegister_1.markViaFingerprint);
router.get("/attendance/absent-today", StudentsRegister_1.getTodayAbsentStudents);
router.post("/attendance/mark-absentees", StudentsRegister_1.markAbsenteesBulk);
router.post("/createattedence", authaniticator_1.authenticate, StudentsRegister_1.markAttendance);
router.put("/attendance/:id", authaniticator_1.authenticate, StudentsRegister_1.updateStudentAttendance);
router.put("/updateAttednce", authaniticator_1.authenticate, StudentsRegister_1.updateAttendance);
router.put("/updateattadence/:id", authaniticator_1.authenticate, StudentsRegister_1.updateAttendance);
router.get("/device-list", StudentsRegister_1.getRegisteredStudentsForDevice);
router.delete("/attendance", authaniticator_1.authenticate, StudentsRegister_1.deleteAttendance);
router.get("/attendance/absent", StudentsRegister_1.getAbsentStudentsByDate);
router.get("/parent/attendance", authaniticator_1.authenticate, StudentsRegister_1.getParentStudentAttendance);
/* -------------------------- Soft Delete / Restore -------------------------- */
router.get("/students/soft-deleted", StudentsRegister_1.listSoftDeletedStudents);
router.put("/softedelete/:id", authaniticator_1.authenticate, StudentsRegister_1.deleteStudent);
router.put("/backsoftedelete/:id", authaniticator_1.authenticate, StudentsRegister_1.backFromSoftDelete);
router.delete("/delete/:id", authaniticator_1.authenticate, StudentsRegister_1.deletepermitly);
/* ------------------------- Yearly Report (Future) ------------------------- */
// router.get("/report/:studentId", getYearlyProgressReportByStudent);
/* ------------------------ Dynamic Student Lookup ------------------------ */
router.get("/:query", StudentsRegister_1.getStudentByIdOrName);
router.get("/Get/:id", StudentsRegister_1.getStudentById);
// /* --------------------- WhatsApp Notification (Future) --------------------- */
// router.post("/notify-absence", async (req, res) => {
//   const { parentPhone, studentName, date } = req.body;
//   try {
//     await notifyAbsence(parentPhone, studentName, date);
//     res.json({ success: true, message: "Notification sent" });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: "Failed to send message" });
//   }
// });
router.delete("/delete-all/:id", StudentsRegister_1.deleteStudentAndRelations);
router.get("/students/brothers", authaniticator_1.authenticate, StudentsRegister_1.getBrothersList);
router.get("/family/by-name", StudentsRegister_1.getStudentsByFamilyNameWritten);
router.put("/student/update-parent", StudentsRegister_1.updateStudentParent);
router.get("/students/same-bus/:bus", StudentsRegister_1.getStudentsWithSameBus);
router.get("/students/by-parent-phone", StudentsRegister_1.getLastStudentByParentPhone);
exports.default = router;

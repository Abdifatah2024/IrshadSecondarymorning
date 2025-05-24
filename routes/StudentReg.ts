import { Router } from "express";
// Middlewares
import { authenticate } from "../middlewares/authaniticator";
import { authorize } from "../middlewares/autharize";
// Controllers
import {
  createStudent,
  createMultipleStudents,
  createMultipleStudentsByExcel,
  upload,
  createclass,
  updateStudent,
  updateStudentClass,
  deleteStudent,
  deletepermitly,
  backFromSoftDelete,
  getStudents,
  getClasses,
  getStudentsByClass,
  getStudentById,
  getStudentByIdOrName,
  listSoftDeletedStudents,
  markAttendance,
  markAbsenteesBulk,
  updateAttendance,
  updateStudentAttendance,
  deleteAttendance,
  getAttendance,
  getAllAbsenteesByDate,
  getTopAbsentStudents,
  getAbsentStudentsByDate,
  deleteMultipleStudentsPermanently,
  deleteStudentAndRelations,
} from "../controller/StudentsRegister";

import { getYearlyProgressReportByStudent } from "../controller/exam.controller";

const router = Router();

/* ----------------------------- Student CRUD ----------------------------- */
router.post("/create", authenticate, createStudent);
router.post("/createMultiple", authenticate, createMultipleStudents);
router.post(
  "/upload-excel",
  upload.single("file"),
  authenticate,
  createMultipleStudentsByExcel
);
router.put("/updateClass", authenticate, updateStudentClass);
router.put("/updateClass", authenticate, updateStudentClass);
router.put("/:id", authenticate, updateStudent);
router.post(
  "/students/delete-range-permanent",
  deleteMultipleStudentsPermanently
);

/* ----------------------------- Class Routes ----------------------------- */
router.post("/createclass", authenticate, authorize("ADMIN"), createclass);

router.get("/classListStd", getClasses);
router.get("/ClassList/:classId", getStudentsByClass);

/* ----------------------------- Student List ----------------------------- */
router.get("/studentList", getStudents);

/* ----------------------------- Attendance Routes ----------------------------- */
router.get("/attedencelist/:id", getAttendance);
router.get("/absentees", getAllAbsenteesByDate);
router.get("/attendance/top-absent", getTopAbsentStudents);

router.post("/attendance/mark-absentees", markAbsenteesBulk);
router.post("/createattedence", authenticate, markAttendance);

router.put("/attendance/:id", authenticate, updateStudentAttendance);
router.put("/updateAttednce", authenticate, updateAttendance);
router.put("/updateattadence/:id", authenticate, updateAttendance);

router.delete("/attendance", authenticate, deleteAttendance);
router.get("/attendance/absent", getAbsentStudentsByDate);

/* -------------------------- Soft Delete / Restore -------------------------- */
router.get("/students/soft-deleted", listSoftDeletedStudents);
router.put("/softedelete/:id", authenticate, deleteStudent);
router.put("/backsoftedelete/:id", authenticate, backFromSoftDelete);
router.delete("/delete/:id", authenticate, deletepermitly);

/* ------------------------- Yearly Report (Future) ------------------------- */
// router.get("/report/:studentId", getYearlyProgressReportByStudent);

/* ------------------------ Dynamic Student Lookup ------------------------ */

router.get("/:query", getStudentByIdOrName);
router.get("/Get/:id", getStudentById);

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
router.delete("/delete-all/:id", deleteStudentAndRelations);

export default router;

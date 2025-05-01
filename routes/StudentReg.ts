import { Router } from "express";
import { authenticate } from "../middlewares/authaniticator";
import {
  createMultipleStudentsByExcel,
  upload,
} from "../controller/StudentsRegister";
import {
  backFromSoftDelete,
  createclass,
  createStudent,
  deletepermitly,
  deleteStudent,
  getAttendance,
  getClasses,
  getStudentById,
  getStudents,
  getStudentsByClass,
  listSoftDeletedStudents,
  markAttendance,
  markAbsenteesBulk,
  updateAttendance,
  updateStudent,
  updateStudentClass,
  deleteAttendance,
  getAllAbsenteesByDate,
  getTopAbsentStudents,
  getStudentByIdOrName,
  createMultipleStudents,
  updateStudentAttendance,
} from "../controller/StudentsRegister";
import { authorize } from "../middlewares/autharize";
const router = Router();

// // Note: marka wax la update gareynaayo ka ugu horeeya ayey ku dhaceysaa.

// router.put("/updateAttednce", authenticate, updateAttendance);
// router.put("/attendance/:id", updateStudentAttendance);

// router.put("/updateClass", updateStudentClass);

// router.post("/create", authenticate, authorize("ADMIN"), createStudent);
// router.post("/createMultiple", authenticate, createMultipleStudents);
// router.post("/upload", upload.single("file"), createMultipleStudentsByExcel);

// // router.post("/createclass", authenticate, createclass);
// router.post("/createclass", authenticate, authorize("ADMIN"), createclass);
// router.get("/studentList", getStudents);

// /// Absent Routes
// router.get("/absentees", getAllAbsenteesByDate);

// router.delete("/updateAttednce", deleteAttendance);
// router.post("/attendance/mark-absentees", markAbsenteesBulk);
// router.post("/createattedence", authenticate, markAttendance);

// router.get("/students/soft-deleted", listSoftDeletedStudents);
// router.get("/ClassList/:classId", getStudentsByClass);
// router.get("/attedencelist/:id", getAttendance);

// router.get("/classtList", getClasses);
// router.get("/:id", getStudentById);
// router.get("/:query", getStudentByIdOrName);

// router.put("/softedelete/:id", deleteStudent);
// router.put("/updateattadence/:id", authenticate, updateAttendance);
// router.get("/attendance/top-absent", getTopAbsentStudents);

// router.put("/backsoftedelete/:id", authenticate, backFromSoftDelete);
// router.delete("/delete/:id", authenticate, deletepermitly);
// router.delete("/attendance", authenticate, deletepermitly);

// export default router;
// Specific routes first
router.post("/create", authenticate, authorize("ADMIN"), createStudent);
router.post("/createMultiple", authenticate, createMultipleStudents);
router.post("/upload", upload.single("file"), createMultipleStudentsByExcel);
router.post("/createclass", authenticate, authorize("ADMIN"), createclass);
router.put("/updateClass", updateStudentClass);
router.put("/:id", authenticate, updateStudent);

// List routes
router.get("/studentList", getStudents);
router.get("/classtList", getClasses);

// Attendance and soft-delete routes
router.get("/absentees", getAllAbsenteesByDate);
router.get("/attendance/top-absent", getTopAbsentStudents);
router.get("/students/soft-deleted", listSoftDeletedStudents);
router.get("/ClassList/:classId", getStudentsByClass);
router.get("/attedencelist/:id", getAttendance);

// Attendance POST/PUT routes
router.post("/attendance/mark-absentees", markAbsenteesBulk);
router.post("/createattedence", authenticate, markAttendance);

router.put("/updateAttednce", authenticate, updateAttendance);
router.put("/attendance/:id", updateStudentAttendance);
router.put("/updateattadence/:id", authenticate, updateAttendance);

// Soft delete and restore
router.put("/softedelete/:id", deleteStudent);
router.put("/backsoftedelete/:id", authenticate, backFromSoftDelete);
router.delete("/delete/:id", authenticate, deletepermitly);
router.delete("/attendance", authenticate, deleteAttendance);

// ⚡ LAST: dynamic routes
router.get("/:id", getStudentById);
router.get("/:query", getStudentByIdOrName);

export default router;

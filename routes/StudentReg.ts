import { Router } from "express";
import { authenticate } from "../middlewares/authaniticator";
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
  markAttendance,
  updateAttendance,
  updateStudent,
} from "../controller/StudentsRegister";
const router = Router();

router.post("/create", authenticate, createStudent);
router.post("/createattedence", authenticate, markAttendance);

router.post("/createclass", authenticate, createclass);
router.get("/studentList", getStudents);
router.get("/ClassList/:classId", getStudentsByClass);
router.get("/attedencelist/:id", getAttendance);

router.get("/classtList", getClasses);
router.get("/:id", getStudentById);
router.put("/:id", authenticate, updateStudent);
router.put("/softedelete/:id", deleteStudent);
router.put("/updateattadence/:id", authenticate, updateAttendance);

router.put("/backsoftedelete/:id", authenticate, backFromSoftDelete);
router.delete("/delete/:id", authenticate, deletepermitly);
router.delete("/attendance", authenticate, deletepermitly);

export default router;

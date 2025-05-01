// import { Router } from "express";
// import { authenticate } from "../middlewares/authaniticator";
// import {
//   AcademicYear,
//   CreateExamType,
//   CreateSubjects,
//   GetExamType,
//   RegisterScore,
// } from "../controller/exam.controller";

// const router = Router();

// router.post("/create", authenticate, CreateExamType);
// router.post("/RegisterScore", authenticate, RegisterScore);
// router.post("/createsubject", authenticate, CreateSubjects);
// router.post("/createAcadmic", AcademicYear);
// router.get("/list", GetExamType);

// export default router;
import { Router } from "express";
import { authenticate } from "../middlewares/authaniticator";
import {
  AcademicYear,
  CreateExamType,
  CreateSubjects,
  getExamReportByClass,
  GetExamType,
  getFinalExamReportByClass,
  getMidtermMonthlyReportByClass,
  listStudentExams,
  RegisterScore,
  registerTenSubjects,
} from "../controller/exam.controller";

const router = Router();

router.post("/create", authenticate, CreateExamType);
router.post("/RegisterScore", authenticate, RegisterScore);
router.post("/createsubject", authenticate, CreateSubjects);
router.post("/createAcademic", authenticate, AcademicYear); // fixed typo + protected
router.get("/list", GetExamType);
router.post("/registerTenSubjects", authenticate, registerTenSubjects);
router.get("/student/:id", listStudentExams);
router.post("/exam-report", getExamReportByClass);
router.post("/final-exam-report", getFinalExamReportByClass);
router.post("/report/midterm-monthly", getMidtermMonthlyReportByClass);

export default router;

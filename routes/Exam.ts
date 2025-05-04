import { Router } from "express";
import { authenticate } from "../middlewares/authaniticator";
import {
  // Exam Type
  CreateExamType,
  GetExamType,

  // Subjects & Scores
  CreateSubjects,
  RegisterScore,
  registerTenSubjects,

  // Academic Year
  AcademicYear,

  // Exam Reports
  getExamReportByClass,
  getFinalExamReportByClass,
  getMidtermMonthlyReportByClass,
  getYearlyProgressReportByStudent,
  listStudentExams,
} from "../controller/exam.controller";

const router = Router();

/* ──────────────── Exam Types ──────────────── */
router.post("/create", authenticate, CreateExamType);
router.get("/list", GetExamType);

/* ──────────────── Subject & Score Registration ──────────────── */
router.post("/createsubject", authenticate, CreateSubjects);
router.post("/RegisterScore", authenticate, RegisterScore);
router.post("/registerTenSubjects", authenticate, registerTenSubjects);

/* ──────────────── Academic Year ──────────────── */
router.post("/createAcademic", authenticate, AcademicYear);

/* ──────────────── Student Exam Info ──────────────── */
router.get("/student/:id", listStudentExams);

/* ──────────────── Reports ──────────────── */
router.post("/exam-report", getExamReportByClass);
router.post("/final-exam-report", getFinalExamReportByClass);
router.post("/report/midterm-monthly", getMidtermMonthlyReportByClass);
router.post(
  "/yearly-progress-report",
  authenticate,
  getYearlyProgressReportByStudent
);

export default router;

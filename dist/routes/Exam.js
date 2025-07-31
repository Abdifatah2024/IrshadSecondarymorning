"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authaniticator_1 = require("../middlewares/authaniticator");
const exam_controller_1 = require("../controller/exam.controller");
const teacherScore_controller_1 = require("../controller/teacherScore.controller");
const router = (0, express_1.Router)();
/* ──────────────── Exam Types ──────────────── */
router.post("/create", authaniticator_1.authenticate, exam_controller_1.CreateExamType);
router.get("/list", exam_controller_1.GetExamType);
/* ──────────────── Subject & Score Registration ──────────────── */
router.post("/createsubject", authaniticator_1.authenticate, exam_controller_1.CreateSubjects);
router.post("/RegisterScore", authaniticator_1.authenticate, exam_controller_1.RegisterScore);
router.post("/registerTenSubjects", authaniticator_1.authenticate, exam_controller_1.registerTenSubjects);
/* ──────────────── Academic Year ──────────────── */
router.post("/createAcademic", authaniticator_1.authenticate, exam_controller_1.AcademicYear);
/* ──────────────── Student Exam Info ──────────────── */
router.get("/student/:studentId/year/:academicYearId", exam_controller_1.listStudentExams);
router.put("/score/update", exam_controller_1.updateExamScore);
router.delete("/score/delete", exam_controller_1.deleteExamScore);
router.post("/update-ten-subjects", exam_controller_1.updateTenSubjects);
// exam.routes.ts
router.get("/student/:studentId/exam/:examId/year/:academicYearId", exam_controller_1.getStudentExamScores);
/* ──────────────── Reports ──────────────── */
router.post("/exam-report", exam_controller_1.getExamReportByClass);
router.post("/final-exam-report", exam_controller_1.getFinalExamReportByClass);
router.post("/report/midterm-monthly", exam_controller_1.getMidtermMonthlyReportByClass);
router.post("/yearly-progress-report", authaniticator_1.authenticate, exam_controller_1.getYearlyProgressReportByStudent);
router.put("/students/upgrade/:id", exam_controller_1.upgradeStudentClass);
router.put("/students/upgrade-all", exam_controller_1.upgradeAllStudents);
router.get("/students/:id/total-score", exam_controller_1.getTotalScoreByAcademicYear);
router.post("/teacher/score", authaniticator_1.authenticate, teacherScore_controller_1.TeacherEnterScore);
router.post("/register/teacher", teacherScore_controller_1.registerTeacher);
router.get("/teacher/:teacherId/assignments", authaniticator_1.authenticate, teacherScore_controller_1.getTeacherAssignmentsById);
router.post("/teacher/assignments", authaniticator_1.authenticate, teacherScore_controller_1.assignTeacherToClassSubject); // routes/teacher.routes.ts
router.put("/exam/teacher/assignments", authaniticator_1.authenticate, teacherScore_controller_1.updateTeacherAssignment);
router.delete("/teacher/assignment/:assignmentId", authaniticator_1.authenticate, teacherScore_controller_1.deleteTeacherAssignment);
router.put("/scores/update", authaniticator_1.authenticate, teacherScore_controller_1.updateStudentScore);
router.put("/admin/user/set-correction-limit", authaniticator_1.authenticate, teacherScore_controller_1.setCorrectionLimit);
router.get("/admin/teacher/:userId/correction-limit", authaniticator_1.authenticate, teacherScore_controller_1.getTeacherCorrectionById);
router.get("/me/correction-limit", authaniticator_1.authenticate, teacherScore_controller_1.getMyCorrectionLimit);
router.get("/dashboard-data", authaniticator_1.authenticate, teacherScore_controller_1.getTeacherDashboardData);
router.get("/summary/parent", authaniticator_1.authenticate, exam_controller_1.getParentStudentExamSummary);
exports.default = router;

import { Router } from "express";
import { authenticate } from "../middlewares/authaniticator";
import {
  AcademicYear,
  CreateExamType,
  CreateSubjects,
  GetExamType,
  RegisterScore,
} from "../controller/exam.controller";

const router = Router();

router.post("/create", authenticate, CreateExamType);
router.post("/RegisterScore", authenticate, RegisterScore);
router.post("/createsubject", authenticate, CreateSubjects);
router.post("/createAcadmic", AcademicYear);
router.get("/list", GetExamType);

export default router;

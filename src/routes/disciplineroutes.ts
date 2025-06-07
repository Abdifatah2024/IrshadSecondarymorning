import { Router } from "express";
import {
  createDiscipline,
  getAllDisciplines,
  getDisciplineById,
  updateDiscipline,
  deleteDiscipline,
  getDisciplineByStudentId,
  addDisciplineComment,
  getMinimalStudentList,
  getParentStudentDiscipline,
  getParentStudentBalances,
} from "../controller/discipline.controller";
import { authenticate } from "../middlewares/authaniticator";

const router = Router();

/* -------------------------- Create Discipline -------------------------- */
router.post("/discipline", authenticate, createDiscipline);
router.post("/discipline/:id", authenticate, addDisciplineComment);

/* -------------------------- Get All Disciplines -------------------------- */
router.get("/discipline", getAllDisciplines);

/* ---------------------- Order Matters: studentId first ---------------------- */
// router.get("/discipline/student/:studentId", getDisciplineByStudentId); // more specific
router.get("/discipline/:id", getDisciplineByStudentId); // generic ID

/* -------------------------- Update & Delete -------------------------- */
router.put("/discipline/:id", updateDiscipline);
router.delete("/discipline/:id", deleteDiscipline);
router.get("/students/minimal", getMinimalStudentList);
router.get(
  "/parent/students/discipline",
  authenticate,
  getParentStudentDiscipline
);
router.get("/parent/students/balance", authenticate, getParentStudentBalances);
export default router;

import { Router } from "express";

import {
  createDiscipline,
  getAllDisciplines,
  getDisciplineById,
  updateDiscipline,
  deleteDiscipline,
  getDisciplineByStudentId,
} from "../controller/discipline.controller";
import { authenticate } from "../middlewares/authaniticator";
const router = Router();

router.post("/discipline", authenticate, createDiscipline);
router.get("/discipline/:studentId", getDisciplineByStudentId);
router.get("/discipline", getAllDisciplines);
router.get("/discipline/:id", getDisciplineById);
router.put("/discipline/:id", updateDiscipline);
router.delete("/discipline/:id", deleteDiscipline);

export default router;

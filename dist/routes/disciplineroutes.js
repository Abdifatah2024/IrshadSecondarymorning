"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const discipline_controller_1 = require("../controller/discipline.controller");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = (0, express_1.Router)();
/* -------------------------- Create Discipline -------------------------- */
router.post("/discipline", authaniticator_1.authenticate, discipline_controller_1.createDiscipline);
router.post("/discipline/:id", authaniticator_1.authenticate, discipline_controller_1.addDisciplineComment);
/* -------------------------- Get All Disciplines -------------------------- */
router.get("/discipline", discipline_controller_1.getAllDisciplines);
/* ---------------------- Order Matters: studentId first ---------------------- */
// router.get("/discipline/student/:studentId", getDisciplineByStudentId); // more specific
router.get("/discipline/:id", discipline_controller_1.getDisciplineByStudentId); // generic ID
/* -------------------------- Update & Delete -------------------------- */
router.put("/discipline/:id", discipline_controller_1.updateDiscipline);
router.delete("/discipline/:id", discipline_controller_1.deleteDiscipline);
router.get("/students/minimal", discipline_controller_1.getMinimalStudentList);
router.get("/parent/students/discipline", authaniticator_1.authenticate, discipline_controller_1.getParentStudentDiscipline);
router.get("/parent/students/balance", authaniticator_1.authenticate, discipline_controller_1.getParentStudentBalances);
exports.default = router;

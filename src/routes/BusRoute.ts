import express from "express";
import {
  assignStudentToBus,
  createBus,
  deleteBus,
  getAllBuses,
  getBusById,
  updateBus,
  getBusSalaryAndFeeSummaryDetailed,
  getAllBusEmployees,
} from "../controller/Bus.controller";

const router = express.Router();
router.get("/bus-summary", getBusSalaryAndFeeSummaryDetailed);
router.put("/assign-bus", assignStudentToBus);
router.post("/bus", createBus);
router.get("/bus", getAllBuses);
router.get("/bus/:id", getBusById);
router.put("/bus/:id", updateBus);
router.delete("/bus/:id", deleteBus);
router.get("/employees/bus", getAllBusEmployees);

export default router;

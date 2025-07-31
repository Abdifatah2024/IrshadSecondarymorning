"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Bus_controller_1 = require("../controller/Bus.controller");
const router = express_1.default.Router();
router.get("/bus-summary", Bus_controller_1.getBusSalaryAndFeeSummaryDetailed);
router.put("/assign-bus", Bus_controller_1.assignStudentToBus);
router.post("/bus", Bus_controller_1.createBus);
router.get("/bus", Bus_controller_1.getAllBuses);
router.get("/bus/:id", Bus_controller_1.getBusById);
router.put("/bus/:id", Bus_controller_1.updateBus);
router.delete("/bus/:id", Bus_controller_1.deleteBus);
router.get("/employees/bus", Bus_controller_1.getAllBusEmployees);
exports.default = router;

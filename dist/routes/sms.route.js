"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sms_controller_1 = require("../controller/sms.controller");
const sendAbsentSMS_1 = require("../controller/sendAbsentSMS");
const router = express_1.default.Router();
router.post("/send", sms_controller_1.sendSMSController);
router.post("/send-absent-sms", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, sendAbsentSMS_1.sendAbsentMessagesForToday)();
        res.status(200).json({ message: "Absent SMS messages sent." });
    }
    catch (err) {
        res.status(500).json({ message: "Error sending SMS", error: err });
    }
}));
router.get("/absent-students/today", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield (0, sms_controller_1.getAbsentStudentsForToday)();
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Fetch Error:", error);
        res.status(500).json({ message: "Failed to fetch absent students" });
    }
}));
router.post("/sms", sms_controller_1.sendSMS);
exports.default = router;

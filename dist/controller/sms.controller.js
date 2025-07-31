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
exports.sendSMS = exports.getAbsentStudentsForToday = exports.sendSMSController = void 0;
const client_1 = require("@prisma/client");
const sendTelesomSMS_1 = require("../Utils/sendTelesomSMS");
const prisma = new client_1.PrismaClient();
const qs_1 = __importDefault(require("qs"));
const axios_1 = __importDefault(require("axios"));
const sendSMSController = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { to, message } = req.body;
    if (!to || !message) {
        return res
            .status(400)
            .json({ message: "Both 'to' and 'message' are required." });
    }
    try {
        const response = yield (0, sendTelesomSMS_1.sendTelesomSMS)(to, message);
        res.status(200).json({
            success: true,
            message: "SMS sent successfully",
            response,
        });
    }
    catch (error) {
        console.error("SMS Error:", error.message);
        res.status(500).json({
            success: false,
            message: "Failed to send SMS",
            error: error.message || "Unknown error",
        });
    }
});
exports.sendSMSController = sendSMSController;
/**
 * 🔍 Fetch all students marked absent today
 */
const getAbsentStudentsForToday = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    const records = yield prisma.attendance.findMany({
        where: {
            date: {
                gte: startOfDay,
                lt: endOfDay,
            },
            present: false,
        },
        include: {
            student: {
                select: {
                    fullname: true,
                    phone: true,
                },
            },
        },
    });
    const result = records
        .filter((record) => { var _a; return (_a = record.student) === null || _a === void 0 ? void 0 : _a.phone; })
        .map((record) => ({
        fullname: record.student.fullname,
        phone: record.student.phone,
        remark: record.remark || "Lama cayimin",
        date: startOfDay.toISOString().split("T")[0],
    }));
    return result;
});
exports.getAbsentStudentsForToday = getAbsentStudentsForToday;
const sendSMS = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = {
            username: "cabdabdivy4mh2025",
            password: "jBiSRISG",
            mno: "00252634740303",
            sid: "Abdifatah",
            msg: "Hello World",
            mt: "0",
        };
        const headers = {
            "Content-Type": "application/x-www-form-urlencoded",
            Cookie: "ASPSESSIONIDACTQTSTS=GEAEKPFCNECDACOHHKHDONEB; ASPSESSIONIDCATTSSST=HFAGPIFCMLKJADCMIOHCLBKD",
        };
        const response = yield axios_1.default.post("https://api.1s2u.io/bulksms", qs_1.default.stringify(data), { headers });
        res.status(200).send(response.data);
    }
    catch (error) {
        console.error("Error sending SMS:", error);
        res.status(500).json({ error: "Failed to send SMS" });
    }
});
exports.sendSMS = sendSMS;

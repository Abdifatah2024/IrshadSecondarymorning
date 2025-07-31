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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAbsentMessagesForToday = void 0;
const client_1 = require("@prisma/client");
const sendTelesomSMS_1 = require("../Utils/sendTelesomSMS");
const prisma = new client_1.PrismaClient();
const sendAbsentMessagesForToday = () => __awaiter(void 0, void 0, void 0, function* () {
    const today = new Date();
    const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
    const absentees = yield prisma.attendance.findMany({
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
    const uniqueMessages = new Set();
    for (const record of absentees) {
        const student = record.student;
        const dateStr = startOfDay.toISOString().split("T")[0];
        if (!student || !student.phone)
            continue;
        const message = `Dear parent, your child ${student.fullname} was absent on ${dateStr}. Reason: ${record.remark}`;
        const messageKey = `${student.phone}-${dateStr}`;
        if (uniqueMessages.has(messageKey))
            continue; // prevent duplicate
        try {
            yield (0, sendTelesomSMS_1.sendTelesomSMS)(student.phone, message);
            console.log(`SMS sent to ${student.fullname} (${student.phone})`);
            uniqueMessages.add(messageKey);
        }
        catch (err) {
            console.error(`Failed to send SMS to ${student.phone}:`, err);
        }
    }
});
exports.sendAbsentMessagesForToday = sendAbsentMessagesForToday;

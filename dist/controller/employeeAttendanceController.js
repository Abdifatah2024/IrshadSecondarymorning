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
exports.generateYearlyEmployeeAttendanceSummary = exports.generateEmployeeAttendanceReport = exports.deleteEmployeeAttendance = exports.updateEmployeeAttendance = exports.getEmployeeAttendanceById = exports.getAllEmployeeAttendances = exports.markEmployeeViaFingerprint = exports.markEmployeeAttendance = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// ✅ Only absent employees are stored
const markEmployeeAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, markedById, present, remark, date } = req.body;
        if (!employeeId || typeof present !== "boolean") {
            return res.status(400).json({ message: "Missing or invalid fields" });
        }
        // If absent, require remark
        if (!present && (!remark || remark.trim().length === 0)) {
            return res.status(400).json({ message: "Remark required if absent" });
        }
        // Parse provided or default to now
        const attendanceDate = date ? new Date(date) : new Date();
        // Convert to UTC start of day
        const utcDate = new Date(Date.UTC(attendanceDate.getUTCFullYear(), attendanceDate.getUTCMonth(), attendanceDate.getUTCDate()));
        // Prevent attendance on Thursday (4) or Friday (5)
        const day = utcDate.getUTCDay();
        if (day === 4 || day === 5) {
            return res
                .status(403)
                .json({ message: "Cannot mark attendance on Thursday or Friday" });
        }
        // Normalize today's UTC date for safe comparison
        const nowUTC = new Date();
        const normalizedToday = new Date(Date.UTC(nowUTC.getUTCFullYear(), nowUTC.getUTCMonth(), nowUTC.getUTCDate()));
        // Prevent marking for future
        if (utcDate > normalizedToday) {
            return res
                .status(400)
                .json({ message: "Cannot mark attendance for future dates" });
        }
        // Only record ABSENCES
        if (!present) {
            // Check if already recorded for today
            const startOfDay = new Date(utcDate);
            const endOfDay = new Date(utcDate);
            endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
            const existing = yield prisma.employeeAttendance.findFirst({
                where: {
                    employeeId: Number(employeeId),
                    date: {
                        gte: startOfDay,
                        lt: endOfDay,
                    },
                },
            });
            if (existing) {
                return res.status(409).json({ message: "Attendance already marked" });
            }
            // Save only if absent
            const attendance = yield prisma.employeeAttendance.create({
                data: {
                    employeeId: Number(employeeId),
                    markedById: Number(markedById),
                    present: false,
                    remark,
                    date: utcDate,
                },
            });
            return res.status(201).json({ success: true, attendance });
        }
        // If present, skip saving
        return res.status(200).json({
            success: true,
            message: "Present - No attendance record created",
        });
    }
    catch (error) {
        console.error("Error marking attendance:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.markEmployeeAttendance = markEmployeeAttendance;
// ✅ Create - Fingerprint
const markEmployeeViaFingerprint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { employeeId, timestamp } = req.body;
        if (!employeeId || !timestamp) {
            return res.status(400).json({ message: "Missing fields" });
        }
        const attendanceDate = new Date(timestamp);
        const startOfDay = new Date(attendanceDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        const existing = yield prisma.employeeAttendance.findFirst({
            where: {
                employeeId: Number(employeeId),
                date: { gte: startOfDay, lt: endOfDay },
            },
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: "Attendance already marked for today" });
        }
        const attendance = yield prisma.employeeAttendance.create({
            data: {
                employeeId: Number(employeeId),
                markedById: Number(employeeId), // self
                present: true,
                remark: "Present - Fingerprint",
                date: attendanceDate,
            },
        });
        res.status(201).json({ success: true, attendance });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Failed to mark attendance via fingerprint" });
    }
});
exports.markEmployeeViaFingerprint = markEmployeeViaFingerprint;
// ✅ Read - All
const getAllEmployeeAttendances = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendances = yield prisma.employeeAttendance.findMany({
            include: {
                employee: true,
                markedBy: true,
            },
            orderBy: {
                date: "desc",
            },
        });
        res.status(200).json(attendances);
    }
    catch (error) {
        res.status(500).json({ message: "Failed to fetch attendance" });
    }
});
exports.getAllEmployeeAttendances = getAllEmployeeAttendances;
// ✅ Read - By ID
const getEmployeeAttendanceById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const attendance = yield prisma.employeeAttendance.findUnique({
            where: { id: Number(id) },
            include: {
                employee: true,
                markedBy: true,
            },
        });
        if (!attendance) {
            return res.status(404).json({ message: "Attendance not found" });
        }
        res.status(200).json(attendance);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching attendance" });
    }
});
exports.getEmployeeAttendanceById = getEmployeeAttendanceById;
// ✅ Update
const updateEmployeeAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { present, remark } = req.body;
        const updated = yield prisma.employeeAttendance.update({
            where: { id: Number(id) },
            data: {
                present,
                remark,
            },
        });
        res.status(200).json({ success: true, updated });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating attendance" });
    }
});
exports.updateEmployeeAttendance = updateEmployeeAttendance;
// ✅ Delete
const deleteEmployeeAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        yield prisma.employeeAttendance.delete({
            where: { id: Number(id) },
        });
        res.status(200).json({ success: true, message: "Deleted successfully" });
    }
    catch (error) {
        res.status(500).json({ message: "Delete failed" });
    }
});
exports.deleteEmployeeAttendance = deleteEmployeeAttendance;
const generateEmployeeAttendanceReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const month = parseInt(req.query.month);
        const year = parseInt(req.query.year);
        if (!month || !year || isNaN(month) || isNaN(year)) {
            return res.status(400).json({ message: "Month and year are required" });
        }
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const today = new Date();
        const isCurrentMonth = today.getUTCFullYear() === year && today.getUTCMonth() === month - 1;
        const endDate = isCurrentMonth
            ? new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1))
            : new Date(Date.UTC(year, month, 1));
        // ✅ Count working days up to today if current month
        let workingDays = 0;
        for (let date = new Date(startDate); date < endDate; date.setUTCDate(date.getUTCDate() + 1)) {
            const day = date.getUTCDay();
            if (day !== 4 && day !== 5)
                workingDays++;
        }
        const absences = yield prisma.employeeAttendance.findMany({
            where: {
                present: false,
                date: {
                    gte: startDate,
                    lt: endDate,
                },
            },
            select: {
                date: true,
                remark: true,
                employee: {
                    select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        jobTitle: true,
                    },
                },
                markedBy: {
                    select: {
                        fullName: true,
                    },
                },
            },
            orderBy: {
                date: "asc",
            },
        });
        const grouped = absences.reduce((acc, entry) => {
            var _a;
            const empId = entry.employee.id;
            if (!acc[empId]) {
                acc[empId] = {
                    employeeId: empId,
                    fullName: entry.employee.fullName,
                    jobTitle: entry.employee.jobTitle,
                    phone: entry.employee.phone,
                    totalAbsences: 0,
                    records: [],
                };
            }
            acc[empId].totalAbsences += 1;
            acc[empId].records.push({
                date: entry.date,
                remark: entry.remark,
                markedBy: ((_a = entry.markedBy) === null || _a === void 0 ? void 0 : _a.fullName) || "Unknown",
            });
            return acc;
        }, {});
        const report = Object.values(grouped).map((emp) => {
            const presentDays = workingDays - emp.totalAbsences;
            const attendanceRate = workingDays > 0
                ? `${((presentDays / workingDays) * 100).toFixed(2)}%`
                : "N/A";
            return Object.assign(Object.assign({}, emp), { presentDays,
                attendanceRate });
        });
        res.status(200).json({
            success: true,
            month,
            year,
            workingDays,
            report,
        });
    }
    catch (error) {
        console.error("Error generating employee attendance report:", error);
        res.status(500).json({ message: "Error fetching attendance report" });
    }
});
exports.generateEmployeeAttendanceReport = generateEmployeeAttendanceReport;
const generateYearlyEmployeeAttendanceSummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const year = parseInt(req.query.year);
        if (!year || isNaN(year)) {
            return res.status(400).json({ message: "Valid year is required" });
        }
        const allEmployees = yield prisma.employee.findMany({
            select: {
                id: true,
                fullName: true,
                phone: true,
                jobTitle: true,
            },
        });
        const summary = yield Promise.all(allEmployees.map((employee) => __awaiter(void 0, void 0, void 0, function* () {
            const monthlySummary = [];
            let totalAbsent = 0;
            let totalPresent = 0;
            for (let month = 0; month < 12; month++) {
                const start = new Date(Date.UTC(year, month, 1));
                const end = new Date(Date.UTC(year, month + 1, 1));
                const allDates = [];
                for (let d = new Date(start); d < end; d.setUTCDate(d.getUTCDate() + 1)) {
                    const day = d.getUTCDay();
                    if (day !== 4 && day !== 5 && d <= new Date()) {
                        allDates.push(new Date(d));
                    }
                }
                const totalWorkingDays = allDates.length;
                const absents = yield prisma.employeeAttendance.count({
                    where: {
                        employeeId: employee.id,
                        present: false,
                        date: {
                            gte: start,
                            lt: end,
                        },
                    },
                });
                const presents = totalWorkingDays - absents;
                monthlySummary.push({
                    month: month + 1,
                    totalWorkingDays,
                    present: presents,
                    absent: absents,
                });
                totalAbsent += absents;
                totalPresent += presents;
            }
            return {
                employeeId: employee.id,
                fullName: employee.fullName,
                jobTitle: employee.jobTitle,
                phone: employee.phone,
                yearlySummary: monthlySummary,
                totalPresent,
                totalAbsent,
            };
        })));
        res.status(200).json({ success: true, year, summary });
    }
    catch (error) {
        console.error("Error generating yearly attendance summary:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.generateYearlyEmployeeAttendanceSummary = generateYearlyEmployeeAttendanceSummary;

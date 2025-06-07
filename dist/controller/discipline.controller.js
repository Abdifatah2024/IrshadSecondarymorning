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
exports.getParentStudentBalances = exports.getParentStudentDiscipline = exports.getMinimalStudentList = exports.addDisciplineComment = exports.deleteDiscipline = exports.updateDiscipline = exports.getDisciplineByStudentId = exports.getDisciplineById = exports.getAllDisciplines = exports.createDiscipline = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Create Discipline — only for students where isdeleted = true
const createDiscipline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, type, description, actionTaken } = req.body;
        // @ts-ignore
        const user = req.user;
        const student = yield prisma.student.findFirst({
            where: {
                id: +studentId,
                isdeleted: false,
            },
        });
        if (!student) {
            return res
                .status(404)
                .json({ message: "Student not found or is not marked as deleted" });
        }
        const discipline = yield prisma.discipline.create({
            data: {
                studentId: +studentId,
                type,
                description,
                actionTaken,
                recordedBy: user.useId,
            },
            include: {
                student: {
                    select: {
                        fullname: true,
                        gender: true,
                    },
                },
            },
        });
        res.status(201).json({
            message: "Discipline record created successfully",
            discipline,
        });
    }
    catch (error) {
        console.error(error);
        res
            .status(500)
            .json({ message: "Server error while creating discipline record" });
    }
});
exports.createDiscipline = createDiscipline;
// Get All Disciplines — only for students where isdeleted = true
const getAllDisciplines = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplines = yield prisma.discipline.findMany({
            where: {
                isDeleted: false,
                student: {
                    isdeleted: false,
                },
            },
            include: {
                student: {
                    select: { fullname: true, gender: true },
                },
                user: {
                    select: { fullName: true },
                },
            },
            orderBy: {
                recordedAt: "desc",
            },
        });
        res.status(200).json(disciplines);
    }
    catch (error) {
        console.error("Error fetching disciplines:", error);
        res
            .status(500)
            .json({ message: "Server error while fetching disciplines" });
    }
});
exports.getAllDisciplines = getAllDisciplines;
// Get Discipline by ID — student must be isdeleted = true
const getDisciplineById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplineId = Number(req.params.id);
        const discipline = yield prisma.discipline.findFirst({
            where: {
                id: disciplineId,
                isDeleted: false,
                student: {
                    isdeleted: false,
                },
            },
            include: {
                student: { select: { fullname: true } },
                user: { select: { fullName: true } },
            },
        });
        if (!discipline) {
            return res.status(404).json({ message: "Discipline record not found" });
        }
        res.status(200).json(discipline);
    }
    catch (error) {
        console.error("Error fetching discipline record:", error);
        res.status(500).json({ message: "Server error while fetching discipline" });
    }
});
exports.getDisciplineById = getDisciplineById;
// Get Discipline by Student ID — only if student isdeleted = true
const getDisciplineByStudentId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const studentId = Number(req.params.id);
        if (isNaN(studentId)) {
            return res.status(400).json({ message: "Invalid Student ID" });
        }
        const student = yield prisma.student.findFirst({
            where: {
                id: studentId,
                isdeleted: false,
            },
            include: {
                classes: {
                    select: { name: true },
                },
                Discipline: {
                    where: { isDeleted: false },
                    orderBy: { recordedAt: "desc" },
                },
            },
        });
        if (!student) {
            return res
                .status(404)
                .json({ message: "Student not found or not deleted" });
        }
        res.status(200).json({
            id: student.id,
            fullname: student.fullname,
            className: ((_a = student.classes) === null || _a === void 0 ? void 0 : _a.name) || "N/A",
            disciplines: student.Discipline,
        });
    }
    catch (error) {
        console.error("Error fetching student discipline:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getDisciplineByStudentId = getDisciplineByStudentId;
// Update Discipline
const updateDiscipline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplineId = Number(req.params.id);
        const { type, description, actionTaken } = req.body;
        const existingRecord = yield prisma.discipline.findUnique({
            where: { id: disciplineId, isDeleted: false },
        });
        if (!existingRecord) {
            return res.status(404).json({ message: "Discipline record not found" });
        }
        const updatedDiscipline = yield prisma.discipline.update({
            where: { id: disciplineId },
            data: {
                type,
                description,
                actionTaken,
            },
        });
        res.status(200).json({
            message: "Discipline record updated successfully",
            discipline: updatedDiscipline,
        });
    }
    catch (error) {
        console.error("Error updating discipline record:", error);
        res.status(500).json({ message: "Server error while updating discipline" });
    }
});
exports.updateDiscipline = updateDiscipline;
// Soft Delete Discipline
const deleteDiscipline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplineId = Number(req.params.id);
        const existingRecord = yield prisma.discipline.findUnique({
            where: { id: disciplineId },
        });
        if (!existingRecord) {
            return res.status(404).json({ message: "Discipline record not found" });
        }
        yield prisma.discipline.update({
            where: { id: disciplineId },
            data: { isDeleted: true },
        });
        res
            .status(200)
            .json({ message: "Discipline record soft deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting discipline record:", error);
        res.status(500).json({ message: "Server error while deleting discipline" });
    }
});
exports.deleteDiscipline = deleteDiscipline;
// Add Comment to Discipline
const addDisciplineComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const disciplineId = Number(req.params.id);
        const { content } = req.body;
        // @ts-ignore
        const user = req.user;
        const comment = yield prisma.disciplineComment.create({
            data: {
                content,
                disciplineId,
                userId: user.useId,
            },
        });
        res.status(201).json({ message: "Comment added", comment });
    }
    catch (err) {
        console.error("Error adding comment:", err);
        res.status(500).json({ message: "Server error while adding comment" });
    }
});
exports.addDisciplineComment = addDisciplineComment;
// Get Minimal Student List — still returns only students not deleted
const getMinimalStudentList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield prisma.student.findMany({
            where: { isdeleted: false },
            select: {
                id: true,
                fullname: true,
            },
            orderBy: {
                fullname: "asc",
            },
        });
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching student list:", error);
        res.status(500).json({ message: "Server error while fetching students" });
    }
});
exports.getMinimalStudentList = getMinimalStudentList;
const getParentStudentDiscipline = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const user = req.user;
        if (!user || user.role !== "PARENT") {
            return res.status(403).json({
                message: "Access denied. Only parents can access this data.",
            });
        }
        const parentUserId = user.useId;
        const students = yield prisma.student.findMany({
            where: {
                parentUserId,
                isdeleted: false,
            },
            select: {
                id: true,
                fullname: true,
                classes: {
                    select: { name: true },
                },
                Discipline: {
                    where: { isDeleted: false },
                    orderBy: { recordedAt: "desc" },
                    select: {
                        id: true,
                        type: true,
                        description: true,
                        actionTaken: true,
                        recordedAt: true,
                    },
                },
            },
        });
        if (!students.length) {
            return res.status(404).json({
                message: "No students found for this parent",
            });
        }
        const result = students.map((student) => {
            var _a;
            return {
                id: student.id,
                fullname: student.fullname,
                className: ((_a = student.classes) === null || _a === void 0 ? void 0 : _a.name) || "N/A",
                totalIncidents: student.Discipline.length,
                disciplineRecords: student.Discipline,
            };
        });
        res.status(200).json({
            success: true,
            message: "Discipline records fetched successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Error fetching parent student discipline:", error);
        res.status(500).json({
            message: "Server error while fetching discipline records",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getParentStudentDiscipline = getParentStudentDiscipline;
const getParentStudentBalances = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const user = req.user;
        if (!user || user.role !== "PARENT") {
            return res.status(403).json({ message: "Access denied" });
        }
        const parentUserId = user.useId;
        const students = yield prisma.student.findMany({
            where: {
                parentUserId,
                isdeleted: false,
            },
            select: {
                id: true,
                fullname: true,
                gender: true,
                Age: true,
                address: true,
                phone: true,
                fee: true, // fixed monthly fee
                classes: { select: { name: true } },
                StudentFee: {
                    select: {
                        month: true,
                        year: true,
                        isPaid: true,
                    },
                },
                Payment: {
                    select: {
                        amountPaid: true,
                    },
                },
                StudentAccount: {
                    select: {
                        carryForward: true,
                    },
                },
            },
        });
        if (!students.length) {
            return res.status(404).json({ message: "No students found" });
        }
        const result = students.map((student) => {
            var _a, _b;
            const monthlyFee = Number(student.fee);
            const totalMonths = student.StudentFee.length;
            const totalFees = monthlyFee * totalMonths;
            const totalPaid = student.Payment.reduce((sum, pmt) => sum + Number(pmt.amountPaid), 0);
            const carryForward = Number(((_a = student.StudentAccount) === null || _a === void 0 ? void 0 : _a.carryForward) || 0);
            const balance = totalFees - totalPaid - carryForward;
            return {
                id: student.id,
                fullname: student.fullname,
                gender: student.gender,
                age: student.Age,
                address: student.address,
                phone: student.phone,
                className: ((_b = student.classes) === null || _b === void 0 ? void 0 : _b.name) || "N/A",
                monthlyFee,
                totalMonths,
                totalFees,
                totalPaid,
                carryForward,
                balance,
            };
        });
        res.status(200).json({
            success: true,
            message: "Balances retrieved successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Error fetching balances:", error);
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getParentStudentBalances = getParentStudentBalances;

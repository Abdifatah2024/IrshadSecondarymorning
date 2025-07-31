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
exports.getTeacherDashboardData = exports.getTeacherCorrectionById = exports.getMyCorrectionLimit = exports.setCorrectionLimit = exports.updateStudentScore = exports.deleteTeacherAssignment = exports.updateTeacherAssignment = exports.assignTeacherToClassSubject = exports.getTeacherAssignmentsById = exports.TeacherEnterScore = exports.registerTeacher = void 0;
const client_1 = require("@prisma/client"); // ✅ for Prisma.PrismaClientKnownRequestError
const client_2 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_2.PrismaClient();
const SALT_ROUNDS = 10;
// ✅ Register a teacher
const registerTeacher = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, email, fullName, phoneNumber, photoUrl } = req.body;
        if (!username || !password || !email || !fullName || !phoneNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const lowerUsername = username.toLowerCase().trim();
        const lowerEmail = email.toLowerCase().trim();
        const normalizedPhone = phoneNumber.replace(/\D/g, "");
        const existingUser = yield prisma.user.findFirst({
            where: {
                OR: [
                    { username: lowerUsername },
                    { email: lowerEmail },
                    { phoneNumber: normalizedPhone },
                ],
            },
        });
        if (existingUser) {
            if (existingUser.username === lowerUsername)
                return res.status(409).json({ message: "Username already exists" });
            if (existingUser.email === lowerEmail)
                return res.status(409).json({ message: "Email already exists" });
            if (existingUser.phoneNumber === normalizedPhone)
                return res.status(409).json({ message: "Phone number already exists" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const newTeacher = yield prisma.user.create({
            data: {
                username: lowerUsername,
                password: hashedPassword,
                email: lowerEmail,
                fullName: fullName.trim(),
                phoneNumber: normalizedPhone,
                photoUrl: photoUrl === null || photoUrl === void 0 ? void 0 : photoUrl.trim(),
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmpassword: hashedPassword,
                role: client_2.Role.Teacher,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                createdAt: true,
                updatedAt: true,
                role: true,
            },
        });
        return res.status(201).json({
            user: newTeacher,
            message: "Teacher registration successful.",
        });
    }
    catch (error) {
        console.error("Teacher registration error:", error);
        return res.status(500).json({
            message: "An unexpected error occurred. Please try again later.",
        });
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.registerTeacher = registerTeacher;
// ✅ Enter exam score (teacher only)
const TeacherEnterScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, examId, academicYearId, scores } = req.body;
        // @ts-ignore
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        if (!userId)
            return res.status(401).json({ message: "Unauthorized" });
        if (!studentId ||
            !examId ||
            !academicYearId ||
            !Array.isArray(scores) ||
            scores.length === 0) {
            return res.status(400).json({
                message: "studentId, examId, academicYearId, and at least one score are required",
            });
        }
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
            select: { classId: true },
        });
        if (!student)
            return res.status(404).json({ message: "Student not found" });
        const classId = student.classId;
        const exam = yield prisma.exam.findUnique({ where: { id: examId } });
        if (!exam)
            return res.status(404).json({ message: "Exam not found" });
        const createdScores = [];
        for (const { subjectId, marks } of scores) {
            const isAuthorized = yield prisma.teacherClass.findFirst({
                where: {
                    teacherId: userId,
                    subjectId,
                    classId,
                },
            });
            if (!isAuthorized) {
                return res.status(403).json({
                    message: `Not authorized to submit score for subject ID ${subjectId} in class ID ${classId}`,
                });
            }
            if (marks > exam.maxMarks) {
                return res.status(400).json({
                    message: `Marks for subject ${subjectId} exceed the max allowed (${exam.maxMarks})`,
                });
            }
            const existing = yield prisma.score.findFirst({
                where: {
                    studentId,
                    examId,
                    subjectId,
                    academicYearId,
                },
            });
            if (existing) {
                return res.status(409).json({
                    message: `Score already exists for subject ${subjectId}`,
                });
            }
            const score = yield prisma.score.create({
                data: {
                    studentId,
                    examId,
                    subjectId,
                    marks,
                    academicYearId,
                    userid: userId,
                },
            });
            createdScores.push(score);
        }
        return res.status(201).json({
            message: "Scores entered successfully",
            scores: createdScores,
        });
    }
    catch (error) {
        console.error("Error entering scores:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.TeacherEnterScore = TeacherEnterScore;
const getTeacherAssignmentsById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teacherId = parseInt(req.params.teacherId);
        if (!teacherId) {
            return res.status(400).json({ message: "Teacher ID is required." });
        }
        const teacher = yield prisma.user.findUnique({
            where: { id: teacherId },
            select: { fullName: true, role: true },
        });
        if (!teacher || teacher.role !== client_2.Role.Teacher) {
            return res
                .status(404)
                .json({ message: "Teacher not found or not a teacher." });
        }
        const assignments = yield prisma.teacherClass.findMany({
            where: { teacherId },
            include: {
                subject: { select: { id: true, name: true } },
                class: { select: { id: true, name: true } },
            },
        });
        const result = assignments.map((assignment) => ({
            id: assignment.id, // ✅ unique ID
            classId: assignment.class.id,
            className: assignment.class.name,
            subjectId: assignment.subject.id,
            subjectName: assignment.subject.name,
        }));
        return res.status(200).json({
            teacherId,
            teacherName: teacher.fullName,
            assignments: result,
        });
    }
    catch (error) {
        console.error("Error fetching assignments by teacherId:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getTeacherAssignmentsById = getTeacherAssignmentsById;
// ✅ Create teacher assignment (class + subject)
const assignTeacherToClassSubject = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { teacherId, classId, subjectId } = req.body;
        if (!teacherId || !classId || !subjectId) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Step 1: Check for existing assignment
        const existing = yield prisma.teacherClass.findFirst({
            where: { teacherId, classId, subjectId },
        });
        if (existing) {
            return res
                .status(409)
                .json({ message: "This assignment already exists" });
        }
        // Step 2: Create the new assignment
        const created = yield prisma.teacherClass.create({
            data: { teacherId, classId, subjectId },
            include: {
                class: true,
                subject: true,
            },
        });
        // Step 3: Fetch teacher name
        const teacher = yield prisma.user.findUnique({
            where: { id: teacherId },
            select: { fullName: true },
        });
        return res.status(201).json({
            message: "Teacher assigned successfully",
            teacherName: teacher === null || teacher === void 0 ? void 0 : teacher.fullName,
            classId: created.class.id,
            className: created.class.name,
            subjectId: created.subject.id,
            subjectName: created.subject.name,
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res.status(400).json({
                message: "Duplicate assignment: Teacher already assigned to this class and subject",
            });
        }
        console.error("Error assigning teacher:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.assignTeacherToClassSubject = assignTeacherToClassSubject;
// PATCH /exam/teacher/assignments
const updateTeacherAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId, classId, subjectId, teacherId } = req.body;
        if (!assignmentId || !classId || !subjectId || !teacherId) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // 1. Check if a different record already has this (teacherId, classId)
        const duplicate = yield prisma.teacherClass.findFirst({
            where: {
                teacherId,
                classId,
                NOT: { id: assignmentId }, // ensure we're not comparing with the same record
            },
        });
        if (duplicate) {
            return res.status(400).json({
                message: "This teacher is already assigned to this class",
            });
        }
        // 2. Update the assignment
        const updated = yield prisma.teacherClass.update({
            where: { id: assignmentId },
            data: {
                classId,
                subjectId,
            },
            include: {
                subject: true,
                class: true,
                teacher: true,
            },
        });
        return res.status(200).json({
            message: "Assignment updated successfully",
            assignment: {
                id: updated.id,
                classId: updated.classId,
                className: updated.class.name,
                subjectId: updated.subjectId,
                subjectName: updated.subject.name,
                teacherId: updated.teacherId,
                teacherName: updated.teacher.fullName,
            },
        });
    }
    catch (error) {
        if (error instanceof client_1.Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002") {
            return res.status(400).json({
                message: "Duplicate assignment: Teacher already assigned to this class",
            });
        }
        console.error("Update assignment error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateTeacherAssignment = updateTeacherAssignment;
const deleteTeacherAssignment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { assignmentId } = req.params;
        const assignment = yield prisma.teacherClass.findUnique({
            where: { id: Number(assignmentId) },
        });
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found." });
        }
        yield prisma.teacherClass.delete({
            where: { id: Number(assignmentId) },
        });
        return res
            .status(200)
            .json({ message: "Assignment deleted successfully", id: assignmentId });
    }
    catch (error) {
        console.error("Delete error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.deleteTeacherAssignment = deleteTeacherAssignment;
// export const updateStudentScore = async (req: Request, res: Response) => {
//   try {
//     const { studentId, subjectId, examId, academicYearId, newMarks } = req.body;
//     // @ts-ignore
//     const userId = req.user?.useId;
//     if (!userId) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }
//     // ✅ Required field validation
//     if (
//       !studentId ||
//       !subjectId ||
//       !examId ||
//       !academicYearId ||
//       newMarks === undefined
//     ) {
//       return res.status(400).json({ message: "Missing required fields." });
//     }
//     // ✅ Zero not allowed
//     if (newMarks === 0) {
//       return res.status(400).json({ message: "Score cannot be zero." });
//     }
//     // ✅ Max allowed marks per exam ID
//     const examMaxMarks: Record<number, number> = {
//       1: 20,
//       2: 30,
//       3: 50,
//     };
//     const maxAllowed = examMaxMarks[examId];
//     if (maxAllowed !== undefined && newMarks > maxAllowed) {
//       return res.status(400).json({
//         message: `Marks for exam ID ${examId} cannot exceed ${maxAllowed}.`,
//       });
//     }
//     // ✅ Find the existing score
//     const score = await prisma.score.findFirst({
//       where: {
//         studentId,
//         subjectId,
//         examId,
//         academicYearId,
//       },
//     });
//     if (!score) {
//       return res.status(404).json({ message: "Score not found." });
//     }
//     // ✅ Check correction limit
//     if (score.correctionCount >= score.correctionLimit) {
//       return res.status(403).json({
//         message: `Score correction limit reached (${score.correctionLimit}). No further updates allowed.`,
//       });
//     }
//     // ✅ Update the score
//     const updatedScore = await prisma.score.update({
//       where: { id: score.id },
//       data: {
//         marks: newMarks,
//         correctionCount: { increment: 1 },
//         lastUpdatedBy: userId,
//         lastUpdatedAt: new Date(),
//       },
//     });
//     return res.status(200).json({
//       message: "Score updated successfully.",
//       updatedScore,
//     });
//   } catch (error) {
//     console.error("Error updating score:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
// PUT /api/admin/score/set-limit
const updateStudentScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, subjectId, examId, academicYearId, newMarks } = req.body;
        // @ts-ignore
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!studentId ||
            !subjectId ||
            !examId ||
            !academicYearId ||
            newMarks === undefined) {
            return res.status(400).json({ message: "Missing required fields." });
        }
        if (newMarks === 0) {
            return res.status(400).json({ message: "Score cannot be zero." });
        }
        const examMaxMarks = {
            1: 20,
            2: 30,
            3: 50,
        };
        const maxAllowed = examMaxMarks[examId];
        if (maxAllowed !== undefined && newMarks > maxAllowed) {
            return res.status(400).json({
                message: `Marks for exam ID ${examId} cannot exceed ${maxAllowed}.`,
            });
        }
        // ✅ Get teacher info
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                correctionLimit: true,
                correctionsUsed: true,
                role: true,
            },
        });
        if (!user || user.role !== "Teacher") {
            return res
                .status(403)
                .json({ message: "Only teachers can update scores." });
        }
        if (user.correctionsUsed >= user.correctionLimit) {
            return res.status(403).json({
                message: `You have reached your correction limit (${user.correctionLimit}).`,
            });
        }
        // ✅ Get student class ID
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
            select: { classId: true },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }
        // ✅ Check if teacher is assigned to this class + subject
        const isAuthorized = yield prisma.teacherClass.findFirst({
            where: {
                teacherId: userId,
                subjectId,
                classId: student.classId,
            },
        });
        if (!isAuthorized) {
            return res.status(403).json({
                message: `You are not authorized to update score for subject ${subjectId} in class ${student.classId}.`,
            });
        }
        // ✅ Find existing score
        const score = yield prisma.score.findFirst({
            where: {
                studentId,
                subjectId,
                examId,
                academicYearId,
            },
        });
        if (!score) {
            return res.status(404).json({ message: "Score not found." });
        }
        // ✅ Update score
        const updatedScore = yield prisma.score.update({
            where: { id: score.id },
            data: {
                marks: newMarks,
                lastUpdatedBy: userId,
                lastUpdatedAt: new Date(),
            },
        });
        // ✅ Increment correctionsUsed
        yield prisma.user.update({
            where: { id: userId },
            data: {
                correctionsUsed: { increment: 1 },
            },
        });
        return res.status(200).json({
            message: "Score updated successfully.",
            updatedScore,
        });
    }
    catch (error) {
        console.error("Error updating score:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateStudentScore = updateStudentScore;
const setCorrectionLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { userId, correctionLimit } = req.body;
        // @ts-ignore
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (userRole !== "ADMIN") {
            return res
                .status(403)
                .json({ message: "Only admins can perform this action." });
        }
        if (!userId || typeof correctionLimit !== "number") {
            return res
                .status(400)
                .json({ message: "User ID and correction limit are required." });
        }
        const user = yield prisma.user.findUnique({ where: { id: userId } });
        if (!user || user.role !== "Teacher") {
            return res.status(404).json({ message: "Teacher not found." });
        }
        const updated = yield prisma.user.update({
            where: { id: userId },
            data: {
                correctionLimit,
            },
        });
        return res.status(200).json({
            message: `Correction limit updated to ${correctionLimit} for ${updated.fullName}`,
            updatedUser: updated,
        });
    }
    catch (error) {
        console.error("Set correction limit error:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.setCorrectionLimit = setCorrectionLimit;
const getMyCorrectionLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-ignore
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                fullName: true,
                role: true,
                correctionLimit: true,
                correctionsUsed: true,
            },
        });
        if (!user || user.role !== "Teacher") {
            return res
                .status(403)
                .json({ message: "Only teachers have correction limits." });
        }
        return res.status(200).json({
            teacherName: user.fullName,
            correctionLimit: user.correctionLimit,
            correctionsUsed: user.correctionsUsed,
            remainingCorrections: user.correctionLimit - user.correctionsUsed,
        });
    }
    catch (error) {
        console.error("Error fetching correction limit:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.getMyCorrectionLimit = getMyCorrectionLimit;
const getTeacherCorrectionById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-ignore
        const userRole = (_a = req.user) === null || _a === void 0 ? void 0 : _a.role;
        if (userRole !== "ADMIN") {
            return res.status(403).json({ message: "Only admins are allowed." });
        }
        const userId = Number(req.params.userId);
        if (!userId) {
            return res.status(400).json({ message: "Teacher ID is required." });
        }
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                fullName: true,
                role: true,
                correctionLimit: true,
                correctionsUsed: true,
            },
        });
        if (!user || user.role !== "Teacher") {
            return res
                .status(404)
                .json({ message: "Teacher not found or invalid role." });
        }
        return res.status(200).json({
            teacherName: user.fullName,
            correctionLimit: user.correctionLimit,
            correctionsUsed: user.correctionsUsed,
            remainingCorrections: user.correctionLimit - user.correctionsUsed,
        });
    }
    catch (error) {
        console.error("Error fetching teacher correction limit:", error);
        return res.status(500).json({ message: "Server error" });
    }
});
exports.getTeacherCorrectionById = getTeacherCorrectionById;
// export const getTeacherDashboardData = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const user = req.user?.useId;
//     // @ts-ignore
//     const userRole = req.user?.role;
//     if (!user || userRole !== "Teacher") {
//       return res
//         .status(403)
//         .json({
//           message: "Access denied. Only teachers can access this route.",
//         });
//     }
//     // ✅ Get assignments
//     const assignments = await prisma.teacherClass.findMany({
//       where: { teacherId: user.id },
//       include: {
//         class: { select: { id: true, name: true } },
//         subject: { select: { id: true, name: true } },
//       },
//     });
//     const formattedAssignments = assignments.map((a) => ({
//       id: a.id,
//       classId: a.class.id,
//       className: a.class.name,
//       subjectId: a.subject.id,
//       subjectName: a.subject.name,
//     }));
//     // ✅ Get correction info
//     const teacher = await prisma.user.findFirst({
//       where: { id: user.id },
//       select: {
//         fullName: true,
//         correctionLimit: true,
//         correctionsUsed: true,
//       },
//     });
//     if (!teacher) {
//       return res.status(404).json({ message: "Teacher not found." });
//     }
//     // ✅ Return combined data
//     return res.status(200).json({
//       teacherId: user.id,
//       teacherName: teacher.fullName,
//       correctionLimit: teacher.correctionLimit,
//       correctionsUsed: teacher.correctionsUsed,
//       remainingCorrections: teacher.correctionLimit - teacher.correctionsUsed,
//       assignments: formattedAssignments,
//     });
//   } catch (error) {
//     console.error("Error fetching teacher dashboard data:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
const getTeacherDashboardData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-ignore
        const teacherId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        // ✅ Make sure your middleware sets req.user.useId and req.user.role
        // @ts-ignore
        // const teacherId = req.user?.useId;
        // const role = req.user.role;
        // if (!teacherId || role !== Role.Teacher) {
        //   return res.status(403).json({ message: "Access denied" });
        // }
        // ✅ Get teacher's basic info
        const teacher = yield prisma.user.findUnique({
            where: { id: teacherId },
            select: {
                fullName: true,
                correctionLimit: true,
                correctionsUsed: true,
                role: true,
            },
        });
        if (!teacher || teacher.role !== client_2.Role.Teacher) {
            return res.status(404).json({ message: "Teacher not found" });
        }
        // ✅ Get teacher's assignments (class + subject)
        const assignments = yield prisma.teacherClass.findMany({
            where: { teacherId },
            include: {
                class: { select: { id: true, name: true } },
                subject: { select: { id: true, name: true } },
            },
        });
        const formattedAssignments = assignments.map((a) => ({
            id: a.id,
            classId: a.class.id,
            className: a.class.name,
            subjectId: a.subject.id,
            subjectName: a.subject.name,
        }));
        return res.status(200).json({
            teacherName: teacher.fullName,
            correctionLimit: teacher.correctionLimit,
            correctionsUsed: teacher.correctionsUsed,
            remainingCorrections: teacher.correctionLimit - teacher.correctionsUsed,
            assignments: formattedAssignments,
        });
    }
    catch (error) {
        console.error("Error fetching teacher dashboard data:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getTeacherDashboardData = getTeacherDashboardData;

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
exports.getStudentExamScores = exports.updateTenSubjects = exports.deleteExamScore = exports.updateExamScore = exports.getTotalScoreByAcademicYear = exports.upgradeStudentClass = exports.upgradeAllStudents = exports.getYearlyProgressReportByStudent = exports.getMidtermMonthlyReportByClass = exports.getFinalExamReportByClass = exports.getExamReportByClass = exports.listStudentExams = exports.AcademicYear = exports.registerTenSubjects = exports.RegisterScore = exports.CreateSubjects = exports.GetExamType = exports.CreateExamType = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Create Exam Type
const CreateExamType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name, type, maxMarks } = req.body;
        if (!name || !type || !maxMarks) {
            return res.status(400).json({ message: "All fields are required" });
        }
        // Validate maxMarks according to ExamType
        if (type === "MONTHLY" && maxMarks !== 20) {
            return res
                .status(400)
                .json({ message: "Monthly Exam must have 20 max marks." });
        }
        if (type === "MIDTERM" && maxMarks !== 30) {
            return res
                .status(400)
                .json({ message: "Midterm Exam must have 30 max marks." });
        }
        if (type === "FINAL" && maxMarks !== 50) {
            return res
                .status(400)
                .json({ message: "Final Exam must have 50 max marks." });
        }
        const checkExamType = yield prisma.exam.findFirst({ where: { name } });
        if (checkExamType) {
            return res.status(400).json({ message: "Exam type already exists" });
        }
        const createExamType = yield prisma.exam.create({
            data: { name, type, maxMarks },
        });
        res.status(201).json(createExamType);
    }
    catch (error) {
        console.error("Error creating exam type:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.CreateExamType = CreateExamType;
// Get All Exam Types
const GetExamType = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const examTypes = yield prisma.exam.findMany();
        res.json(examTypes);
    }
    catch (error) {
        console.error("Error fetching exam types:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.GetExamType = GetExamType;
// Create Subject
const CreateSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: "Subject name is required" });
        }
        const existingSubject = yield prisma.subject.findFirst({ where: { name } });
        if (existingSubject) {
            return res.status(400).json({ message: "Subject already exists" });
        }
        const createSubject = yield prisma.subject.create({ data: { name } });
        res.status(201).json(createSubject);
    }
    catch (error) {
        console.error("Error creating subject:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.CreateSubjects = CreateSubjects;
const RegisterScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, examId, subjectId, marks, academicYearId } = req.body;
        if (!studentId || !examId || !subjectId || marks === undefined) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const exam = yield prisma.exam.findUnique({
            where: { id: examId },
        });
        if (!exam) {
            return res.status(404).json({ message: "Exam not found." });
        }
        // ✅ Use provided academicYearId or fallback to exam.academicYearId
        const resolvedAcademicYearId = academicYearId || exam.academicYearId;
        if (!resolvedAcademicYearId) {
            return res.status(400).json({ message: "Academic Year ID is missing." });
        }
        // ✅ Prevent duplicate score only if academic year also matches
        const existingScore = yield prisma.score.findFirst({
            where: {
                studentId,
                examId,
                subjectId,
                academicYearId: resolvedAcademicYearId,
            },
        });
        if (existingScore) {
            return res.status(400).json({
                message: "Score already exists for this exam, subject, and academic year.",
            });
        }
        // ✅ Validate marks based on exam type
        if (marks > exam.maxMarks) {
            return res.status(400).json({
                message: `Marks cannot be greater than maximum allowed (${exam.maxMarks}) for this exam.`,
            });
        }
        if (exam.type === "MONTHLY" && marks > 20) {
            return res
                .status(400)
                .json({ message: "Monthly exam marks must not exceed 20." });
        }
        if (exam.type === "MIDTERM" && marks > 30) {
            return res
                .status(400)
                .json({ message: "Midterm exam marks must not exceed 30." });
        }
        if (exam.type === "FINAL" && marks > 50) {
            return res
                .status(400)
                .json({ message: "Final exam marks must not exceed 50." });
        }
        //@ts-ignore
        const user = req.user;
        const createScore = yield prisma.score.create({
            data: {
                studentId,
                examId,
                subjectId,
                marks,
                userid: user.useId,
                academicYearId: resolvedAcademicYearId,
            },
        });
        res.status(201).json({
            message: "Score registered successfully",
            score: createScore,
        });
    }
    catch (error) {
        console.error("Error registering score:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.RegisterScore = RegisterScore;
const registerTenSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, examId, academicYearId, scores, } = req.body;
        if (!studentId ||
            !examId ||
            !academicYearId ||
            !scores ||
            scores.length !== 10) {
            return res.status(400).json({
                message: "All fields are required and must register exactly 10 subjects.",
            });
        }
        const exam = yield prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            return res.status(404).json({ message: "Exam not found." });
        }
        // ✅ Check marks based on exam type
        for (const { subjectId, marks } of scores) {
            if (marks > exam.maxMarks) {
                return res.status(400).json({
                    message: `Marks cannot exceed ${exam.maxMarks} for this Exam.`,
                });
            }
            if (exam.type === "MONTHLY" && marks > 20) {
                return res
                    .status(400)
                    .json({ message: "Monthly exam marks must not exceed 20." });
            }
            if (exam.type === "MIDTERM" && marks > 30) {
                return res
                    .status(400)
                    .json({ message: "Midterm exam marks must not exceed 30." });
            }
            if (exam.type === "FINAL" && marks > 50) {
                return res
                    .status(400)
                    .json({ message: "Final exam marks must not exceed 50." });
            }
        }
        //@ts-ignore
        const user = req.user;
        // ✅ Check for duplicates within the same academic year
        for (const { subjectId } of scores) {
            const existingScore = yield prisma.score.findFirst({
                where: {
                    studentId,
                    examId,
                    subjectId,
                    academicYearId, // ✅ only blocks if same academic year
                },
            });
            if (existingScore) {
                return res.status(400).json({
                    message: `Score for subject ID ${subjectId} already exists for this student, exam, and academic year.`,
                });
            }
        }
        // ✅ Save all 10 scores
        const createdScores = yield Promise.all(scores.map(({ subjectId, marks }) => prisma.score.create({
            data: {
                studentId,
                examId,
                subjectId,
                marks,
                userid: user.useId,
                academicYearId,
            },
        })));
        res.status(201).json({
            message: "All 10 subjects registered successfully.",
            scores: createdScores,
        });
    }
    catch (error) {
        console.error("Error registering 10 subjects:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.registerTenSubjects = registerTenSubjects;
const AcademicYear = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { year } = req.body;
        if (!year) {
            return res.status(400).json({ message: "Year is required" });
        }
        const existingYear = yield prisma.academicYear.findFirst({
            where: { year },
        });
        if (existingYear) {
            return res.status(400).json({ message: "Academic year already exists" });
        }
        const academicYear = yield prisma.academicYear.create({ data: { year } });
        res.status(201).json({
            message: "Academic year created successfully",
            academicYear,
        });
    }
    catch (error) {
        console.error("Error creating academic year:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.AcademicYear = AcademicYear;
const listStudentExams = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const studentId = Number(req.params.studentId);
        const academicYearId = Number(req.params.academicYearId);
        if (!studentId || !academicYearId) {
            return res
                .status(400)
                .json({ message: "Student ID and Academic Year ID are required." });
        }
        // Fetch student
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
            select: {
                id: true,
                fullname: true,
                classes: { select: { name: true } },
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // Fetch academic year name
        const academicYear = yield prisma.academicYear.findUnique({
            where: { id: academicYearId },
        });
        if (!academicYear) {
            return res.status(404).json({ message: "Academic Year not found" });
        }
        // Get scores filtered by academic year
        const scores = yield prisma.score.findMany({
            where: {
                studentId,
                academicYearId,
            },
            select: {
                marks: true,
                subject: { select: { name: true } },
                exam: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        // Group scores by exam
        const examMap = {};
        for (const score of scores) {
            const examId = score.exam.id;
            if (!examMap[examId]) {
                examMap[examId] = {
                    examId,
                    examName: score.exam.name,
                    subjectScores: [],
                };
            }
            examMap[examId].subjectScores.push({
                subjectName: score.subject.name,
                marks: score.marks,
            });
        }
        // Return final result
        const result = {
            student: {
                id: student.id,
                fullName: student.fullname,
                class: ((_a = student.classes) === null || _a === void 0 ? void 0 : _a.name) || "No Class",
            },
            academicYear: academicYear.year, // ✅ include year name like "2024-2025"
            exams: Object.values(examMap),
        };
        res.status(200).json(result);
    }
    catch (error) {
        console.error("Error in listStudentExams:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.listStudentExams = listStudentExams;
const getExamReportByClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId, examId } = req.body;
        if (!classId || !examId) {
            return res.status(400).json({
                message: "Class ID and Exam ID are required in the request body.",
            });
        }
        // Fetch students in the class
        const students = yield prisma.student.findMany({
            where: { classId: Number(classId) },
            select: {
                id: true,
                fullname: true,
                Score: {
                    where: { examId: Number(examId) },
                    select: {
                        marks: true,
                        subject: { select: { name: true } },
                    },
                },
            },
        });
        if (!students.length) {
            return res
                .status(404)
                .json({ message: "No students found for this class" });
        }
        // Build student report with subject-wise marks and total
        const studentReports = students.map((student) => {
            const subjectScores = student.Score.map((score) => ({
                subject: score.subject.name,
                marks: score.marks,
            }));
            const totalMarks = student.Score.reduce((acc, score) => acc + score.marks, 0);
            return {
                studentId: student.id,
                fullName: student.fullname,
                totalMarks,
                subjects: subjectScores,
            };
        });
        // Sort by totalMarks and assign ranks
        studentReports.sort((a, b) => b.totalMarks - a.totalMarks);
        const rankedReport = studentReports.map((student, index) => (Object.assign(Object.assign({}, student), { rank: index + 1 })));
        res.status(200).json({
            classId: Number(classId),
            examId: Number(examId),
            report: rankedReport,
        });
    }
    catch (error) {
        console.error("Error generating exam report by class:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getExamReportByClass = getExamReportByClass;
// export const getFinalExamReportByClass = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { classId } = req.body;
//     if (!classId) {
//       return res.status(400).json({ message: "Class ID is required." });
//     }
//     // Get all students in the class
//     const students = await prisma.student.findMany({
//       where: { classId: Number(classId) },
//       select: {
//         id: true,
//         fullname: true,
//         Score: {
//           select: {
//             marks: true,
//             subject: { select: { name: true } },
//             exam: { select: { type: true } },
//           },
//         },
//       },
//     });
//     if (!students.length) {
//       return res
//         .status(404)
//         .json({ message: "No students found in this class." });
//     }
//     const studentReports = students.map((student) => {
//       // Combine marks from all 3 exam types per subject
//       const subjectMap: { [key: string]: number } = {};
//       student.Score.forEach((score) => {
//         const subjectName = score.subject.name;
//         if (["MONTHLY", "MIDTERM", "FINAL"].includes(score.exam.type)) {
//           subjectMap[subjectName] =
//             (subjectMap[subjectName] || 0) + score.marks;
//         }
//       });
//       const subjectScores = Object.entries(subjectMap).map(
//         ([subject, marks]) => ({
//           subject,
//           marks,
//         })
//       );
//       const totalMarks = subjectScores.reduce(
//         (sum, subj) => sum + subj.marks,
//         0
//       );
//       return {
//         studentId: student.id,
//         fullName: student.fullname,
//         totalMarks,
//         subjects: subjectScores,
//       };
//     });
//     // Sort by total marks in descending order
//     studentReports.sort((a, b) => b.totalMarks - a.totalMarks);
//     // Assign ranks with handling for same marks
//     let currentRank = 1;
//     let lastTotalMarks: number | null = null;
//     let rankOffset = 0;
//     const rankedReport = studentReports.map((student, index) => {
//       if (student.totalMarks === lastTotalMarks) {
//         rankOffset++;
//       } else {
//         currentRank = index + 1;
//         currentRank += rankOffset;
//         rankOffset = 0;
//         lastTotalMarks = student.totalMarks;
//       }
//       return {
//         ...student,
//         rank: currentRank,
//       };
//     });
//     res.status(200).json({
//       classId: Number(classId),
//       report: rankedReport,
//     });
//   } catch (error) {
//     console.error("Error fetching final exam report:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// Get Midterm Result.
const getFinalExamReportByClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId, academicYearId } = req.body;
        if (!classId || !academicYearId) {
            return res
                .status(400)
                .json({ message: "Class ID and Academic Year ID are required." });
        }
        // Get all students in the class
        const students = yield prisma.student.findMany({
            where: { classId: Number(classId) },
            select: {
                id: true,
                fullname: true,
                Score: {
                    where: { academicYearId: Number(academicYearId) },
                    select: {
                        marks: true,
                        subject: { select: { name: true } },
                        exam: { select: { type: true } },
                    },
                },
            },
        });
        if (!students.length) {
            return res
                .status(404)
                .json({ message: "No students found in this class." });
        }
        const studentReports = students.map((student) => {
            const subjectMap = {};
            student.Score.forEach((score) => {
                const subjectName = score.subject.name;
                if (["MONTHLY", "MIDTERM", "FINAL"].includes(score.exam.type)) {
                    subjectMap[subjectName] =
                        (subjectMap[subjectName] || 0) + score.marks;
                }
            });
            const subjectScores = Object.entries(subjectMap).map(([subject, marks]) => ({
                subject,
                marks,
            }));
            const totalMarks = subjectScores.reduce((sum, subj) => sum + subj.marks, 0);
            return {
                studentId: student.id,
                fullName: student.fullname,
                totalMarks,
                subjects: subjectScores,
            };
        });
        // Sort by total marks descending
        studentReports.sort((a, b) => b.totalMarks - a.totalMarks);
        // Assign ranks with handling for same marks
        let currentRank = 1;
        let lastTotal = null;
        let offset = 0;
        const rankedReport = studentReports.map((student, index) => {
            if (student.totalMarks === lastTotal) {
                offset++;
            }
            else {
                currentRank = index + 1;
                currentRank += offset;
                offset = 0;
                lastTotal = student.totalMarks;
            }
            return Object.assign(Object.assign({}, student), { rank: currentRank });
        });
        res.status(200).json({
            classId: Number(classId),
            academicYearId: Number(academicYearId),
            report: rankedReport,
        });
    }
    catch (error) {
        console.error("Error fetching final exam report:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getFinalExamReportByClass = getFinalExamReportByClass;
const getMidtermMonthlyReportByClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId } = req.body;
        if (!classId) {
            return res.status(400).json({ message: "Class ID is required." });
        }
        // Fetch all students with their scores from the given class
        const students = yield prisma.student.findMany({
            where: { classId: Number(classId) },
            select: {
                id: true,
                fullname: true,
                Score: {
                    select: {
                        marks: true,
                        subject: { select: { name: true } },
                        exam: { select: { type: true } },
                    },
                },
            },
        });
        if (!students.length) {
            return res
                .status(404)
                .json({ message: "No students found in this class." });
        }
        // Build student reports
        const studentReports = students.map((student) => {
            const subjectMap = {};
            student.Score.forEach((score) => {
                const subjectName = score.subject.name;
                const examType = score.exam.type;
                if (examType === "MONTHLY" || examType === "MIDTERM") {
                    subjectMap[subjectName] =
                        (subjectMap[subjectName] || 0) + score.marks;
                }
            });
            const subjectScores = Object.entries(subjectMap).map(([subject, marks]) => ({ subject, marks }));
            const totalMarks = subjectScores.reduce((sum, s) => sum + s.marks, 0);
            return {
                studentId: student.id,
                fullName: student.fullname,
                totalMarks,
                subjects: subjectScores,
            };
        });
        // Sort by total marks descending
        studentReports.sort((a, b) => b.totalMarks - a.totalMarks);
        // Assign ranks
        let currentRank = 1;
        let lastScore = null;
        let sameRankCount = 0;
        const rankedReports = studentReports.map((student, index) => {
            if (student.totalMarks === lastScore) {
                sameRankCount++;
            }
            else {
                currentRank = index + 1;
                currentRank += sameRankCount;
                sameRankCount = 0;
                lastScore = student.totalMarks;
            }
            return Object.assign(Object.assign({}, student), { rank: currentRank });
        });
        return res.status(200).json({
            classId: Number(classId),
            report: rankedReports,
        });
    }
    catch (error) {
        console.error("Error generating midterm/monthly report:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.getMidtermMonthlyReportByClass = getMidtermMonthlyReportByClass;
const getYearlyProgressReportByStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, academicYearId } = req.body;
        if (!studentId || !academicYearId) {
            return res
                .status(400)
                .json({ message: "Student ID and Academic Year ID are required." });
        }
        const student = yield prisma.student.findUnique({
            where: { id: Number(studentId) },
            select: {
                id: true,
                fullname: true,
                classes: { select: { name: true } },
                Score: {
                    where: { academicYearId: Number(academicYearId) },
                    select: {
                        marks: true,
                        subject: { select: { name: true } },
                        exam: { select: { type: true } },
                    },
                },
            },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found." });
        }
        const subjectMap = {};
        for (const score of student.Score) {
            const subject = score.subject.name;
            const type = score.exam.type;
            if (!subjectMap[subject]) {
                subjectMap[subject] = { MONTHLY: 0, MIDTERM: 0, FINAL: 0 };
            }
            subjectMap[subject][type] = score.marks;
        }
        const progressReport = Object.entries(subjectMap).map(([subject, scores]) => {
            const monthly = scores.MONTHLY || 0;
            const midterm = scores.MIDTERM || 0;
            const final = scores.FINAL || 0;
            const total = monthly + midterm + final;
            return {
                subject,
                monthly,
                midterm,
                final,
                total,
            };
        });
        res.status(200).json({
            student: {
                id: student.id,
                fullName: student.fullname,
                class: ((_a = student.classes) === null || _a === void 0 ? void 0 : _a.name) || "No Class",
            },
            academicYearId: Number(academicYearId),
            progressReport,
        });
    }
    catch (error) {
        console.error("Error generating yearly progress report:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getYearlyProgressReportByStudent = getYearlyProgressReportByStudent;
//Upgrade student Class after final exam passed.
const upgradeAllStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { year } = req.query;
    if (!year) {
        return res
            .status(400)
            .json({ message: "Missing academic year (e.g. ?year=2024-2025)" });
    }
    try {
        // 1. Find the academic year ID
        const academicYear = yield prisma.academicYear.findUnique({
            where: { year: year },
        });
        if (!academicYear) {
            return res
                .status(404)
                .json({ message: `Academic year "${year}" not found.` });
        }
        // 2. Get total scores for all students in that academic year
        const scores = yield prisma.score.groupBy({
            by: ["studentId"],
            where: {
                academicYearId: academicYear.id,
            },
            _sum: {
                marks: true,
            },
        });
        const upgradedStudents = [];
        for (const score of scores) {
            const studentId = score.studentId;
            const totalMarks = (_a = score._sum.marks) !== null && _a !== void 0 ? _a : 0;
            if (totalMarks < 500)
                continue;
            const student = yield prisma.student.findUnique({
                where: { id: studentId },
                include: { classes: true },
            });
            if (!student || !student.classes)
                continue;
            const currentClassName = student.classes.name;
            const match = currentClassName.match(/^(\d+)([A-Za-z]+)$/);
            if (!match)
                continue;
            const currentNumber = parseInt(match[1]);
            const letter = match[2];
            const nextClassName = `${currentNumber + 1}${letter}`;
            const nextClass = yield prisma.classes.findFirst({
                where: { name: nextClassName },
            });
            if (!nextClass)
                continue;
            const updatedStudent = yield prisma.student.update({
                where: { id: studentId },
                data: {
                    classId: nextClass.id,
                },
                include: { classes: true },
            });
            upgradedStudents.push({
                id: updatedStudent.id,
                firstname: updatedStudent.firstname,
                newClass: updatedStudent.classes.name,
            });
        }
        return res.json({
            academicYear: year,
            upgradedCount: upgradedStudents.length,
            students: upgradedStudents,
        });
    }
    catch (error) {
        console.error("Upgrade error:", error);
        return res.status(500).json({ message: "Server error", error });
    }
});
exports.upgradeAllStudents = upgradeAllStudents;
const upgradeStudentClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const studentId = parseInt(req.params.id);
    try {
        const totalScore = yield prisma.score.aggregate({
            _sum: {
                marks: true,
            },
            where: {
                studentId: studentId,
            },
        });
        const total = (_a = totalScore._sum.marks) !== null && _a !== void 0 ? _a : 0;
        if (total < 500) {
            return res.status(200).json({
                message: "Student score is less than 500. No upgrade applied.",
            });
        }
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
            include: { classes: true },
        });
        if (!student || !student.classes) {
            return res.status(404).json({ message: "Student or class not found." });
        }
        const currentClassName = student.classes.name;
        const match = currentClassName.match(/^(\d+)([A-Za-z]+)$/);
        if (!match) {
            return res.status(400).json({ message: "Invalid class name format." });
        }
        const currentNumber = parseInt(match[1]);
        const letter = match[2];
        const nextClassName = `${currentNumber + 1}${letter}`;
        const nextClass = yield prisma.classes.findFirst({
            where: { name: nextClassName },
        });
        if (!nextClass) {
            return res
                .status(404)
                .json({ message: `Next class (${nextClassName}) not found.` });
        }
        const updatedStudent = yield prisma.student.update({
            where: { id: studentId },
            data: {
                classId: nextClass.id,
            },
            include: { classes: true },
        });
        return res.json({
            id: updatedStudent.id,
            firstname: updatedStudent.firstname,
            newClass: updatedStudent.classes.name,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error });
    }
});
exports.upgradeStudentClass = upgradeStudentClass;
// src/controllers/score.controller.ts
const getTotalScoreByAcademicYear = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const studentId = parseInt(req.params.id);
    const academicYear = req.query.year;
    if (!academicYear) {
        return res
            .status(400)
            .json({ message: "Missing academic year (e.g., 2024-2025)" });
    }
    try {
        // Find academic year ID
        const year = yield prisma.academicYear.findUnique({
            where: { year: academicYear },
        });
        if (!year) {
            return res
                .status(404)
                .json({ message: `Academic year ${academicYear} not found.` });
        }
        // Sum scores for all exam types (monthly + midterm + final)
        const total = yield prisma.score.aggregate({
            where: {
                studentId,
                academicYearId: year.id,
            },
            _sum: {
                marks: true,
            },
        });
        return res.json({
            studentId,
            academicYear,
            totalMarks: (_a = total._sum.marks) !== null && _a !== void 0 ? _a : 0,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error", error });
    }
});
exports.getTotalScoreByAcademicYear = getTotalScoreByAcademicYear;
// Update an existing score
const updateExamScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, examId, subjectId, marks, academicYearId } = req.body;
        if (!studentId ||
            !examId ||
            !subjectId ||
            marks === undefined ||
            !academicYearId) {
            return res.status(400).json({ message: "All fields are required" });
        }
        const exam = yield prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }
        if (marks > exam.maxMarks) {
            return res.status(400).json({
                message: `Marks cannot exceed ${exam.maxMarks} for this exam.`,
            });
        }
        const existingScore = yield prisma.score.findFirst({
            where: { studentId, examId, subjectId },
        });
        if (existingScore) {
            const updatedScore = yield prisma.score.update({
                where: { id: existingScore.id },
                data: { marks },
            });
            return res.status(200).json({
                message: "Score updated successfully",
                score: updatedScore,
            });
        }
        else {
            const createdScore = yield prisma.score.create({
                data: {
                    studentId,
                    examId,
                    subjectId,
                    marks,
                    academicYearId,
                    // Optional: if using authentication middleware
                    //@ts-ignore
                    userid: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.useId) || 1,
                },
            });
            return res.status(201).json({
                message: "Score created successfully",
                score: createdScore,
            });
        }
    }
    catch (error) {
        console.error("Error in updateExamScore:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateExamScore = updateExamScore;
// Delete a score record
const deleteExamScore = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, examId, subjectId } = req.body;
        if (!studentId || !examId || !subjectId) {
            return res
                .status(400)
                .json({ message: "studentId, examId, and subjectId are required" });
        }
        const score = yield prisma.score.findFirst({
            where: { studentId, examId, subjectId },
        });
        if (!score) {
            return res.status(404).json({ message: "Score not found" });
        }
        yield prisma.score.delete({ where: { id: score.id } });
        res.status(200).json({ message: "Score deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting score:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.deleteExamScore = deleteExamScore;
// export const updateTenSubjects = async (req: Request, res: Response) => {
//   try {
//     const { studentId, examId, academicYearId, scores } = req.body;
//     if (!studentId || !examId || !academicYearId || !Array.isArray(scores)) {
//       return res.status(400).json({ message: "Invalid payload" });
//     }
//     const exam = await prisma.exam.findUnique({ where: { id: examId } });
//     if (!exam) {
//       return res.status(404).json({ message: "Exam not found" });
//     }
//     const updatedResults = [];
//     for (const score of scores) {
//       const { subjectId, marks } = score;
//       if (marks > exam.maxMarks) {
//         return res.status(400).json({
//           message: `Marks for subject ${subjectId} cannot exceed ${exam.maxMarks}`,
//         });
//       }
//       const existing = await prisma.score.findFirst({
//         where: { studentId, examId, subjectId },
//       });
//       if (existing) {
//         const updated = await prisma.score.update({
//           where: { id: existing.id },
//           data: { marks },
//         });
//         updatedResults.push(updated);
//       } else {
//         const created = await prisma.score.create({
//           data: {
//             studentId,
//             examId,
//             subjectId,
//             marks,
//             academicYearId,
//             // optional if you have auth
//             //@ts-ignore
//             userid: req.user?.useId || 1,
//           },
//         });
//         updatedResults.push(created);
//       }
//     }
//     res.status(200).json({
//       message: "Scores updated/created successfully",
//       scores: updatedResults,
//     });
//   } catch (error) {
//     console.error("Error updating scores:", error);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
// controller/examController.ts or similar
// export const getStudentExamScores = async (req: Request, res: Response) => {
//   try {
//     const studentId = parseInt(req.params.studentId);
//     const examId = parseInt(req.params.examId);
//     if (!studentId || !examId) {
//       return res
//         .status(400)
//         .json({ message: "Student ID and Exam ID are required." });
//     }
//     const scores = await prisma.score.findMany({
//       where: {
//         studentId,
//         examId,
//       },
//       include: {
//         subject: true, // include subject name
//       },
//     });
//     if (!scores || scores.length === 0) {
//       return res
//         .status(404)
//         .json({ message: "No scores found for this student and exam." });
//     }
//     const formatted = scores.map((score) => ({
//       subjectId: score.subjectId,
//       subjectName: score.subject.name,
//       marks: score.marks,
//     }));
//     res.status(200).json({ scores: formatted });
//   } catch (err) {
//     console.error("Error fetching student exam scores:", err);
//     res.status(500).json({ message: "Internal server error" });
//   }
// };
const updateTenSubjects = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentId, examId, academicYearId, scores } = req.body;
        if (!studentId || !examId || !academicYearId || !Array.isArray(scores)) {
            return res.status(400).json({ message: "Invalid payload" });
        }
        const exam = yield prisma.exam.findUnique({ where: { id: examId } });
        if (!exam) {
            return res.status(404).json({ message: "Exam not found" });
        }
        const updatedResults = [];
        for (const score of scores) {
            const { subjectId, marks } = score;
            if (marks > exam.maxMarks) {
                return res.status(400).json({
                    message: `Marks for subject ${subjectId} cannot exceed ${exam.maxMarks}`,
                });
            }
            const existing = yield prisma.score.findFirst({
                where: { studentId, examId, subjectId, academicYearId },
            });
            if (existing) {
                const updated = yield prisma.score.update({
                    where: { id: existing.id },
                    data: { marks },
                });
                updatedResults.push(updated);
            }
            else {
                const created = yield prisma.score.create({
                    data: {
                        studentId,
                        examId,
                        subjectId,
                        marks,
                        academicYearId,
                        // optional if you have auth
                        //@ts-ignore
                        userid: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.useId) || 1,
                    },
                });
                updatedResults.push(created);
            }
        }
        res.status(200).json({
            message: "Scores updated/created successfully",
            scores: updatedResults,
        });
    }
    catch (error) {
        console.error("Error updating scores:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.updateTenSubjects = updateTenSubjects;
const getStudentExamScores = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = parseInt(req.params.studentId);
        const examId = parseInt(req.params.examId);
        const academicYearId = parseInt(req.params.academicYearId);
        if (!studentId || !examId || !academicYearId) {
            return res.status(400).json({
                message: "Student ID, Exam ID, and Academic Year ID are required.",
            });
        }
        const scores = yield prisma.score.findMany({
            where: {
                studentId,
                examId,
                academicYearId,
            },
            include: {
                subject: true,
            },
        });
        if (!scores || scores.length === 0) {
            return res.status(404).json({
                message: "No scores found for this student, exam, and academic year.",
            });
        }
        const formatted = scores.map((score) => ({
            subjectId: score.subjectId,
            subjectName: score.subject.name,
            marks: score.marks,
        }));
        res.status(200).json({ scores: formatted });
    }
    catch (err) {
        console.error("Error fetching student exam scores:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getStudentExamScores = getStudentExamScores;

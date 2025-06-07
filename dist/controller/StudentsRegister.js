"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.upload = exports.getLastStudentByParentPhone = exports.getStudentsWithSameBus = exports.updateStudentParent = exports.getParentStudentAttendance = exports.getStudentsByFamilyNameWritten = exports.getBrothersList = exports.getTodayAbsentStudents = exports.getStudents = exports.getRegisteredStudentsForDevice = exports.deleteStudentAndRelations = exports.deleteMultipleStudentsPermanently = exports.deleteAttendance = exports.updateAttendance = exports.getAllAbsenteesByDate = exports.getAttendance = exports.markAbsenteesBulk = exports.getAbsentStudentsByDate = exports.updateStudentAttendance = exports.getTopAbsentStudents = exports.markViaFingerprint = exports.markAttendance = exports.getStudentsByClass = exports.getClasses = exports.createclass = exports.deletepermitly = exports.backFromSoftDelete = exports.listSoftDeletedStudents = exports.deleteStudent = exports.updateStudentClass = exports.updateStudent = exports.getStudentByIdOrName = exports.getStudentById = exports.createMultipleStudentsByExcel = exports.createMultipleStudents = exports.createStudent = void 0;
const client_1 = require("@prisma/client");
const sendTwilioMessage_1 = require("./sendTwilioMessage"); // make sure path is correct
const prisma = new client_1.PrismaClient();
const multer_1 = __importDefault(require("multer"));
const XLSX = __importStar(require("xlsx"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// const upload = multer({ dest: "uploads/" }); // store uploaded files temporarily
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
});
exports.upload = upload;
// Create Student
const createStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstname, middlename, lastname, fourtname, classId, phone, phone2, bus, address, previousSchool, previousSchoolType, // NEW FIELD
        motherName, gender, age, fee, } = req.body;
        // @ts-ignore
        const user = req.user;
        const fullname = `${firstname} ${middlename} ${lastname} ${fourtname || ""}`.trim();
        const username = `${lastname.toLowerCase()}_${phone.slice(-4)}`;
        const email = `${username}@parent.school.com`;
        // Find or create parent
        let parentUser = yield prisma.user.findFirst({
            where: {
                phoneNumber: phone,
                role: "PARENT",
            },
        });
        if (!parentUser) {
            const hashedPassword = yield bcryptjs_1.default.hash(phone, 10);
            parentUser = yield prisma.user.create({
                data: {
                    fullName: motherName || `${firstname} ${lastname} Parent`,
                    username,
                    email,
                    phoneNumber: phone,
                    password: hashedPassword,
                    confirmpassword: hashedPassword,
                    role: "PARENT",
                },
            });
        }
        const result = yield prisma.$transaction((prisma) => __awaiter(void 0, void 0, void 0, function* () {
            const newStudent = yield prisma.student.create({
                data: {
                    firstname,
                    middlename,
                    lastname,
                    fourtname,
                    fullname,
                    classId: Number(classId),
                    phone,
                    phone2,
                    bus,
                    address,
                    previousSchool,
                    previousSchoolType: previousSchoolType || "NOT_SPECIFIC", // handle default
                    motherName,
                    gender,
                    Age: Number(age),
                    fee: Number(fee),
                    userid: user.useId,
                    parentUserId: parentUser.id,
                },
            });
            const today = new Date();
            yield prisma.studentFee.create({
                data: {
                    studentId: newStudent.id,
                    month: today.getMonth() + 1,
                    year: today.getFullYear(),
                    isPaid: false,
                },
            });
            yield prisma.studentAccount.create({
                data: {
                    studentId: newStudent.id,
                    carryForward: 0,
                },
            });
            return newStudent;
        }));
        res.status(201).json({
            message: "Student created with initial fee generated successfully",
            student: result,
            parentAccount: {
                email: parentUser.email,
                username: parentUser.username,
                password: phone,
                parentId: parentUser.id,
            },
        });
    }
    catch (error) {
        console.error("Error creating student:", error);
        res.status(500).json({
            message: "Server error while creating student",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createStudent = createStudent;
// export const createStudent = async (req: Request, res: Response) => {
//   try {
//     const {
//       firstname,
//       middlename,
//       lastname,
//       fourtname,
//       classId,
//       phone,
//       phone2,
//       bus,
//       address,
//       previousSchool,
//       motherName,
//       gender,
//       age,
//       fee,
//     } = req.body;
//     // @ts-ignore
//     const user = req.user;
//     const fullname = `${firstname} ${middlename} ${lastname} ${
//       fourtname || ""
//     }`.trim();
//     const username = `${lastname.toLowerCase()}_${phone.slice(-4)}`;
//     const email = `${username}@parent.school.com`;
//     // Reuse or create parent
//     let parentUser = await prisma.user.findFirst({
//       where: {
//         phoneNumber: phone,
//         role: "PARENT",
//       },
//     });
//     if (!parentUser) {
//       const hashedPassword = await bcryptjs.hash(phone, 10);
//       parentUser = await prisma.user.create({
//         data: {
//           fullName: motherName || `${firstname} ${lastname} Parent`,
//           username,
//           email,
//           phoneNumber: phone,
//           password: hashedPassword,
//           confirmpassword: hashedPassword,
//           role: "PARENT",
//         },
//       });
//     }
//     const result = await prisma.$transaction(async (prisma) => {
//       // Create student
//       const newStudent = await prisma.student.create({
//         data: {
//           firstname,
//           middlename,
//           lastname,
//           fourtname,
//           fullname,
//           classId: Number(classId),
//           phone,
//           phone2,
//           bus,
//           address,
//           previousSchool,
//           motherName,
//           gender,
//           Age: Number(age),
//           fee: Number(fee),
//           userid: user.useId, // or user.id, depending on your middleware
//           parentUserId: parentUser.id,
//         },
//       });
//       const today = new Date();
//       const currentMonth = today.getMonth() + 1;
//       const currentYear = today.getFullYear();
//       await prisma.studentFee.create({
//         data: {
//           studentId: newStudent.id,
//           month: currentMonth,
//           year: currentYear,
//           isPaid: false,
//         },
//       });
//       await prisma.studentAccount.create({
//         data: {
//           studentId: newStudent.id,
//           carryForward: 0,
//         },
//       });
//       return newStudent;
//     });
//     res.status(201).json({
//       message: "Student created with initial fee generated successfully",
//       student: result,
//       parentAccount: {
//         email: parentUser.email,
//         username: parentUser.username,
//         password: phone,
//         parentId: parentUser.id,
//       },
//     });
//   } catch (error) {
//     console.error("Error creating student with fee:", error);
//     res.status(500).json({
//       message: "Server error while creating student",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
// create multiple students
// export const createMultipleStudents = async (req: Request, res: Response) => {
//   try {
//     const studentsData = req.body; // Expecting an array of students
//     // Ensure the input is an array of students
//     if (!Array.isArray(studentsData) || studentsData.length === 0) {
//       return res
//         .status(400)
//         .json({ message: "Invalid input, expected an array of students" });
//     }
//     // @ts-ignore
//     const user = req.user;
//     const createdStudents = [];
//     for (const studentData of studentsData) {
//       const {
//         firstname,
//         middlename,
//         lastname,
//         classId,
//         phone,
//         gender,
//         Age,
//         fee,
//         phone2,
//         bus,
//         address,
//         previousSchool,
//         motherName,
//       } = studentData;
//       // Check if the student already exists based on phone number
//       const checkStudent = await prisma.student.findFirst({
//         where: { phone },
//       });
//       if (checkStudent) {
//         return res
//           .status(400)
//           .json({ message: `Phone number ${phone} already exists` });
//       }
//       const fullname = `${firstname} ${middlename} ${lastname}`;
//       // Create the student record
//       const newStudent = await prisma.student.create({
//         data: {
//           firstname,
//           middlename,
//           lastname,
//           fullname,
//           classId,
//           phone,
//           gender,
//           Age,
//           fee,
//           phone2,
//           bus,
//           address,
//           previousSchool,
//           motherName,
//           userid: user.useId,
//         },
//       });
//       createdStudents.push(newStudent);
//     }
//     res.status(201).json({
//       message: "Students created successfully",
//       students: createdStudents,
//     });
//   } catch (error) {
//     console.error("Error creating students:", error);
//     res.status(500).json({ message: "Server error while creating students" });
//   }
// };
// export const createMultipleStudents = async (req: Request, res: Response) => {
//   try {
//     const studentsData = req.body;
//     if (!Array.isArray(studentsData) || studentsData.length === 0) {
//       return res.status(400).json({
//         message: "Invalid input, expected an array of students",
//       });
//     }
//     // @ts-ignore
//     const user = req.user;
//     const createdStudents = [];
//     for (const studentData of studentsData) {
//       const {
//         firstname,
//         middlename,
//         lastname,
//         fourtname,
//         classId,
//         phone,
//         phone2,
//         bus,
//         address,
//         previousSchool,
//         previousSchoolType,
//         motherName,
//         gender,
//         Age,
//         fee,
//       } = studentData;
//       // Check if the student already exists based on phone number
//       const existing = await prisma.student.findFirst({ where: { phone } });
//       if (existing) {
//         return res.status(400).json({
//           message: `Phone number ${phone} already exists.`,
//         });
//       }
//       const fullname = `${firstname} ${middlename} ${lastname} ${
//         fourtname || ""
//       }`.trim();
//       const newStudent = await prisma.student.create({
//         data: {
//           firstname,
//           middlename,
//           lastname,
//           fourtname,
//           fullname,
//           classId: Number(classId),
//           phone,
//           phone2,
//           bus,
//           address,
//           previousSchool,
//           previousSchoolType: previousSchoolType || "NOT_SPECIFIC", // <- enum
//           motherName,
//           gender,
//           Age: Number(Age),
//           fee: Number(fee),
//           userid: user.useId, // or user.id based on your auth
//         },
//       });
//       // Create student account and fee (optional)
//       const today = new Date();
//       await prisma.studentFee.create({
//         data: {
//           studentId: newStudent.id,
//           month: today.getMonth() + 1,
//           year: today.getFullYear(),
//           isPaid: false,
//         },
//       });
//       await prisma.studentAccount.create({
//         data: {
//           studentId: newStudent.id,
//           carryForward: 0,
//         },
//       });
//       createdStudents.push(newStudent);
//     }
//     res.status(201).json({
//       message: "Students created successfully",
//       students: createdStudents,
//     });
//   } catch (error) {
//     console.error("Error creating students:", error);
//     res.status(500).json({
//       message: "Server error while creating students",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const createMultipleStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentsData = req.body;
        if (!Array.isArray(studentsData) || studentsData.length === 0) {
            return res.status(400).json({
                message: "Invalid input, expected an array of students",
            });
        }
        // @ts-ignore
        const user = req.user;
        const createdStudents = [];
        for (const studentData of studentsData) {
            const { firstname, middlename, lastname, fourtname, classId, phone, phone2, bus, address, previousSchool, previousSchoolType, motherName, gender, Age, fee, } = studentData;
            // Check if the student already exists
            const existing = yield prisma.student.findFirst({ where: { phone } });
            if (existing) {
                return res.status(400).json({
                    message: `Phone number ${phone} already exists.`,
                });
            }
            const fullname = `${firstname} ${middlename} ${lastname} ${fourtname || ""}`.trim();
            const username = `${lastname.toLowerCase()}_${phone.slice(-4)}`;
            const email = `${username}@parent.school.com`;
            // Reuse or create parent user
            let parentUser = yield prisma.user.findFirst({
                where: {
                    phoneNumber: phone,
                    role: "PARENT",
                },
            });
            if (!parentUser) {
                const hashedPassword = yield bcryptjs_1.default.hash(phone, 10);
                parentUser = yield prisma.user.create({
                    data: {
                        fullName: motherName || `${firstname} ${lastname} Parent`,
                        username,
                        email,
                        phoneNumber: phone,
                        password: hashedPassword,
                        confirmpassword: hashedPassword,
                        role: "PARENT",
                    },
                });
            }
            const today = new Date();
            const currentMonth = today.getMonth() + 1;
            const currentYear = today.getFullYear();
            // Create student and related data in transaction
            const newStudent = yield prisma.student.create({
                data: {
                    firstname,
                    middlename,
                    lastname,
                    fourtname,
                    fullname,
                    classId: Number(classId),
                    phone,
                    phone2,
                    bus,
                    address,
                    previousSchool,
                    previousSchoolType: previousSchoolType || "NOT_SPECIFIC",
                    motherName,
                    gender,
                    Age: Number(Age),
                    fee: Number(fee),
                    userid: user.useId,
                    parentUserId: parentUser.id,
                },
            });
            yield prisma.studentFee.create({
                data: {
                    studentId: newStudent.id,
                    month: currentMonth,
                    year: currentYear,
                    isPaid: false,
                },
            });
            yield prisma.studentAccount.create({
                data: {
                    studentId: newStudent.id,
                    carryForward: 0,
                },
            });
            createdStudents.push(newStudent);
        }
        res.status(201).json({
            message: "Students created successfully with parent and fee records",
            students: createdStudents,
        });
    }
    catch (error) {
        console.error("Error creating multiple students:", error);
        res.status(500).json({
            message: "Server error while creating students",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.createMultipleStudents = createMultipleStudents;
const createMultipleStudentsByExcel = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const user = req.user;
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const studentsData = XLSX.utils.sheet_to_json(worksheet);
        if (!Array.isArray(studentsData) || studentsData.length === 0) {
            return res
                .status(400)
                .json({ message: "Excel file is empty or invalid" });
        }
        const createdStudents = [];
        const skippedStudents = [];
        for (let i = 0; i < studentsData.length; i++) {
            const row = studentsData[i];
            const { firstname, middlename, lastname, classId, phone, gender, Age, fee, phone2, bus, address, previousSchool, motherName, } = row;
            const rowIndex = i + 2; // Excel row number (header = row 1)
            // Validate essential fields
            if (!firstname || !lastname || !classId || !phone) {
                skippedStudents.push({
                    row: rowIndex,
                    reason: "Missing required fields (firstname, lastname, phone, classId)",
                });
                continue;
            }
            const phoneStr = String(phone);
            const busStr = bus ? String(bus) : null;
            // Check for duplicate phone
            const existing = yield prisma.student.findFirst({
                where: { phone: phoneStr },
            });
            if (existing) {
                skippedStudents.push({
                    row: rowIndex,
                    reason: "Duplicate phone number",
                });
                continue;
            }
            const fullname = `${firstname} ${middlename || ""} ${lastname}`.trim();
            try {
                const newStudent = yield prisma.student.create({
                    data: {
                        firstname,
                        middlename,
                        lastname,
                        fullname,
                        classId: +classId,
                        phone: phoneStr,
                        gender,
                        Age: Age ? +Age : 0, // ✅ fallback to 0 if missing
                        fee,
                        phone2: phone2 ? String(phone2) : null,
                        bus: busStr, // ✅ bus is string
                        address,
                        previousSchool,
                        motherName,
                        userid: user.useId, // ✅ ensure useId is correct
                    },
                });
                createdStudents.push(newStudent);
            }
            catch (err) {
                skippedStudents.push({
                    row: rowIndex,
                    reason: "Database error during insertion",
                });
            }
        }
        res.status(201).json({
            message: `${createdStudents.length} students uploaded.`,
            created: createdStudents.length,
            skipped: skippedStudents.length,
            skippedDetails: skippedStudents,
        });
    }
    catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Server error while uploading students" });
    }
});
exports.createMultipleStudentsByExcel = createMultipleStudentsByExcel;
// Get Single Student by ID
const getStudentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        const student = yield prisma.student.findUnique({
            where: { id: studentId, isdeleted: false },
            include: {
                classes: {
                    select: {
                        name: true,
                    },
                },
                user: {
                    select: {
                        fullName: true,
                    },
                },
            },
        });
        if (!student) {
            return res
                .status(404)
                .json({ message: "Student not found please try agian" });
        }
        res.status(200).json(student);
    }
    catch (error) {
        console.error("Error fetching student:", error);
        res.status(500).json({ message: "Server error while fetching student" });
    }
});
exports.getStudentById = getStudentById;
const getStudentByIdOrName = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const query = req.params.query.trim().replace(/\s+/g, " ");
        const isId = !isNaN(Number(query));
        const students = yield prisma.student.findMany({
            where: Object.assign({ isdeleted: false }, (isId
                ? { id: Number(query) }
                : {
                    OR: [
                        { fullname: { contains: query, mode: "insensitive" } },
                        { firstname: { contains: query, mode: "insensitive" } },
                        { lastname: { contains: query, mode: "insensitive" } },
                        {
                            AND: [
                                {
                                    firstname: {
                                        contains: query.split(" ")[0],
                                        mode: "insensitive",
                                    },
                                },
                                {
                                    lastname: {
                                        contains: query.split(" ").slice(-1)[0],
                                        mode: "insensitive",
                                    },
                                },
                            ],
                        },
                    ],
                })),
            include: {
                classes: { select: { name: true } },
                user: { select: { email: true } },
            },
        });
        if (students.length === 0) {
            return res.status(404).json({ message: "No students found" });
        }
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Search error:", error);
        res.status(500).json({ message: "Search failed" });
    }
});
exports.getStudentByIdOrName = getStudentByIdOrName;
const updateStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        const { firstname, middlename, lastname, fourtname, // ✅ newly added
        classId, phone, gender, Age, fee, phone2, bus, address, previousSchool, motherName, previousSchoolType, } = req.body;
        // ✅ full name (can be used for display)
        const fullname = `${firstname} ${middlename || ""} ${lastname || ""} ${fourtname || ""}`
            .trim()
            .replace(/\s+/g, " ");
        // ✅ family name (your requested format)
        const familyName = `Reer ${middlename || ""} ${lastname || ""} ${fourtname || ""}`
            .trim()
            .replace(/\s+/g, " ");
        // @ts-ignore
        const user = req.user;
        const updatedStudent = yield prisma.student.update({
            where: { id: studentId },
            data: {
                firstname,
                middlename,
                lastname,
                fourtname, // ✅ added
                fullname, // ✅ updated
                familyName, // ✅ added
                classId: Number(classId),
                phone,
                gender,
                Age,
                fee: Number(fee),
                phone2,
                bus,
                address,
                previousSchool,
                motherName,
                previousSchoolType,
                userid: Number(user.useId),
            },
        });
        res.status(200).json({
            message: "Student updated successfully",
            student: updatedStudent,
        });
    }
    catch (error) {
        console.error("Error updating student:", error);
        res.status(500).json({ message: "Server error while updating student" });
    }
});
exports.updateStudent = updateStudent;
const updateStudentClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, classId } = req.body;
        // Check if both studentId and classId are provided
        if (!studentId || !classId) {
            return res
                .status(400)
                .json({ message: "studentId and classId are required" });
        }
        // Validate that the class exists
        const classExists = yield prisma.classes.findUnique({
            where: { id: classId },
        });
        if (!classExists) {
            return res.status(404).json({ message: "Class not found" });
        }
        // Update only the classId of the student
        const updatedStudent = yield prisma.student.update({
            where: { id: studentId },
            data: { classId },
        });
        res.status(200).json({
            message: "Student's class updated successfully",
            student: updatedStudent,
        });
    }
    catch (error) {
        console.error("Error updating student's class:", error);
        res
            .status(500)
            .json({ message: "Server error while updating student's class" });
    }
});
exports.updateStudentClass = updateStudentClass;
// Soft Delete Student
const deleteStudent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        const student = yield prisma.student.findFirst({
            where: { id: studentId },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        yield prisma.student.update({
            where: { id: studentId },
            data: { isdeleted: true },
        });
        res.status(200).json({
            student,
            message: "Student deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: "Server error while deleting student" });
    }
});
exports.deleteStudent = deleteStudent;
// soft deleted student list
const listSoftDeletedStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const softDeletedStudents = yield prisma.student.findMany({
            where: {
                isdeleted: true,
            },
        });
        res.status(200).json(softDeletedStudents);
    }
    catch (error) {
        console.error("Error fetching soft-deleted students:", error);
        res.status(500).json({
            message: "Server error while fetching soft-deleted students",
        });
    }
});
exports.listSoftDeletedStudents = listSoftDeletedStudents;
// back student from soft delete
const backFromSoftDelete = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        // Check if student exists
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // Check if student is already active
        if (!student.isdeleted) {
            return res.status(400).json({
                message: "Student is already active",
                student,
            });
        }
        // Restore the student
        const updatedStudent = yield prisma.student.update({
            where: { id: studentId },
            data: { isdeleted: false },
        });
        res.status(200).json({
            message: "Student successfully restored",
            student: updatedStudent,
        });
    }
    catch (error) {
        console.error("Error restoring student:", error);
        res.status(500).json({
            message: "Server error while restoring student",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.backFromSoftDelete = backFromSoftDelete;
// delete student perminatly
const deletepermitly = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        yield prisma.student.delete({
            where: { id: studentId },
        });
        res.status(200).json({ message: "Student deleted perminatly" });
    }
    catch (error) {
        console.error("Error deleting student:", error);
        res.status(500).json({ message: "Server error while deleting student" });
    }
});
exports.deletepermitly = deletepermitly;
// class create
const createclass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const user = req.user;
        const { name } = req.body;
        const checkclass = yield prisma.classes.findFirst({
            where: { name: name },
        });
        if (checkclass) {
            return res.status(400).json({ message: "Class name already exists" });
        }
        const newClass = yield prisma.classes.create({
            data: {
                name: name,
                userid: user.useId,
            },
        });
        res
            .status(201)
            .json({ message: "Class created successfully", class: newClass });
    }
    catch (error) {
        console.error("Error creating class:", error);
        res.status(500).json({ message: "Server error while creating class" });
    }
});
exports.createclass = createclass;
// find class and its student list.
const getClasses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classes = yield prisma.classes.findMany({
            include: {
                Student: {
                    include: {
                        user: {
                            select: {
                                fullName: true,
                            },
                        },
                    },
                },
            },
        });
        res.status(200).json(classes);
    }
    catch (error) {
        console.error("Error fetching classes:", error);
        res.status(500).json({ message: "Server error while fetching classes" });
    }
});
exports.getClasses = getClasses;
// Get Student from Specific Class
const getStudentsByClass = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { classId } = req.params; // Get classId from request parameters
        const students = yield prisma.student.findMany({
            where: { classId: parseInt(classId) }, // Ensure classId is an integer if it's a number
        });
        res.status(200).json({ students });
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Server error while fetching students" });
    }
});
exports.getStudentsByClass = getStudentsByClass;
// export const markAttendance = async (req: Request, res: Response) => {
//   try {
//     const { studentId, present, remark, date } = req.body as attendance & {
//       date?: string;
//     };
//     // Parse the input date or use current date if not provided
//     const attendanceDate = date ? new Date(date) : new Date();
//     // Convert to UTC date at midnight for comparison
//     const attendanceUTCDate = new Date(
//       Date.UTC(
//         attendanceDate.getUTCFullYear(),
//         attendanceDate.getUTCMonth(),
//         attendanceDate.getUTCDate()
//       )
//     );
//     // Check if the date is a non-working day (Thursday = 4, Friday = 5)
//     const day = attendanceUTCDate.getUTCDay();
//     if (day === 4 || day === 5) {
//       return res.status(403).json({
//         message:
//           "Attendance cannot be marked on Thursdays and Fridays (non-working days)",
//         errorCode: "NON_WORKING_DAY",
//       });
//     }
//     // Don't allow future dates
//     const today = new Date();
//     const todayUTCDate = new Date(
//       Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
//     );
//     if (attendanceUTCDate > todayUTCDate) {
//       return res.status(400).json({
//         message: "Cannot mark attendance for future dates",
//         errorCode: "FUTURE_DATE",
//       });
//     }
//     // Validate input parameters
//     if (typeof present !== "boolean") {
//       return res.status(400).json({
//         message: "Invalid attendance status format",
//       });
//     }
//     // Validate remark for absent cases
//     if (!present && (!remark || remark.trim().length === 0)) {
//       return res.status(400).json({
//         message: "Remark is required for absent records",
//         errorCode: "REMARK_REQUIRED",
//       });
//     }
//     // Verify student existence
//     const student = await prisma.student.findUnique({
//       where: { id: +studentId },
//       select: { id: true },
//     });
//     if (!student) {
//       return res.status(404).json({
//         message: "Student not found",
//         errorCode: "STUDENT_NOT_FOUND",
//       });
//     }
//     // @ts-ignore - Assuming authenticated user
//     const user = req.user;
//     // Date range for checking existing attendance (whole day in UTC)
//     const dateStart = attendanceUTCDate;
//     const dateEnd = new Date(
//       Date.UTC(
//         attendanceUTCDate.getUTCFullYear(),
//         attendanceUTCDate.getUTCMonth(),
//         attendanceUTCDate.getUTCDate() + 1
//       )
//     );
//     // Check for existing attendance with transaction
//     const [existingAttendance, studentStatus] = await prisma.$transaction([
//       prisma.attendance.findFirst({
//         where: {
//           studentId: +studentId,
//           date: { gte: dateStart, lt: dateEnd },
//         },
//       }),
//       prisma.attendance.findFirst({
//         where: { studentId: +studentId },
//         orderBy: { created_at: "desc" },
//       }),
//     ]);
//     // Prevent duplicate attendance
//     if (existingAttendance) {
//       return res.status(409).json({
//         message: `Attendance already recorded for ${
//           attendanceUTCDate.toISOString().split("T")[0]
//         }`,
//         existingRecord: {
//           status: existingAttendance.present ? "Present" : "Absent",
//           time: existingAttendance.date.toISOString(),
//         },
//         errorCode: "DUPLICATE_ATTENDANCE",
//       });
//     }
//     // Additional business logic: Prevent marking absent for students with special status
//     if (!present && studentStatus?.remark === "SICK_LEAVE") {
//       return res.status(400).json({
//         message: "Cannot mark absent for students on sick leave",
//         errorCode: "INVALID_STATUS_ACTION",
//       });
//     }
//     // Create attendance record with the specified date
//     const newAttendance = await prisma.attendance.create({
//       data: {
//         studentId: +studentId,
//         userId: user.useId,
//         present,
//         remark: present ? "Present" : remark,
//         date: attendanceDate, // Use the provided date or current date/time
//       },
//     });
//     // Post-attendance actions
//     if (!present) {
//       await prisma.student.update({
//         where: { id: +studentId },
//         data: { absentCount: { increment: 1 } },
//       });
//     }
//     res.status(201).json({
//       success: true,
//       message: `Student marked as ${present ? "Present" : "Absent"} for ${
//         attendanceUTCDate.toISOString().split("T")[0]
//       }`,
//       attendance: {
//         id: newAttendance.id,
//         status: newAttendance.present ? "Present" : "Absent",
//         date: newAttendance.date.toISOString(),
//       },
//     });
//   } catch (error) {
//     console.error("Attendance error:", error);
//     res.status(500).json({
//       message: "Internal server error",
//       errorCode: "SERVER_ERROR",
//     });
//   }
// };
// export const getTopAbsentStudents = async (req: Request, res: Response) => {
//   try {
//     // Get top 3 students with highest absent count
//     const topAbsentStudents = await prisma.student.findMany({
//       select: {
//         id: true,
//         fullname: true,
//         absentCount: true,
//         classId: true,
//       },
//       orderBy: {
//         absentCount: "desc",
//       },
//       take: 5,
//     });
//     // Get their most recent absence dates
//     const studentsWithRecentAbsences = await Promise.all(
//       topAbsentStudents.map(async (student) => {
//         const recentAbsences = await prisma.attendance.findMany({
//           where: {
//             studentId: student.id,
//             present: false,
//           },
//           select: {
//             date: true,
//             remark: true,
//           },
//           orderBy: {
//             date: "desc",
//           },
//           take: 5, // Get last 3 absence dates
//         });
//         return {
//           ...student,
//           recentAbsences: recentAbsences.map((absence) => ({
//             date: absence.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
//             remark: absence.remark,
//             ID: student.id,
//           })),
//         };
//       })
//     );
//     res.status(200).json({
//       success: true,
//       data: studentsWithRecentAbsences.map((student) => ({
//         id: student.id,
//         name: student.fullname,
//         totalAbsences: student.absentCount,
//         recentAbsences: student.recentAbsences,
//       })),
//     });
//   } catch (error) {
//     console.error("Error fetching top absent students:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to retrieve top absent students",
//       error: Error,
//     });
//   }
// };
//update attendence
const markAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, present, remark, date } = req.body;
        const attendanceDate = date ? new Date(date) : new Date();
        const attendanceUTCDate = new Date(Date.UTC(attendanceDate.getUTCFullYear(), attendanceDate.getUTCMonth(), attendanceDate.getUTCDate()));
        const day = attendanceUTCDate.getUTCDay();
        if (day === 4 || day === 5) {
            return res.status(403).json({
                message: "Attendance cannot be marked on Thursdays and Fridays (non-working days)",
                errorCode: "NON_WORKING_DAY",
            });
        }
        const today = new Date();
        const todayUTCDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
        if (attendanceUTCDate > todayUTCDate) {
            return res.status(400).json({
                message: "Cannot mark attendance for future dates",
                errorCode: "FUTURE_DATE",
            });
        }
        if (typeof present !== "boolean") {
            return res
                .status(400)
                .json({ message: "Invalid attendance status format" });
        }
        if (!present && (!remark || remark.trim().length === 0)) {
            return res.status(400).json({
                message: "Remark is required for absent records",
                errorCode: "REMARK_REQUIRED",
            });
        }
        const student = yield prisma.student.findUnique({
            where: { id: +studentId },
            select: {
                id: true,
                fullname: true,
                phone: true,
            },
        });
        if (!student) {
            return res.status(404).json({
                message: "Student not found",
                errorCode: "STUDENT_NOT_FOUND",
            });
        }
        // @ts-ignore
        const user = req.user;
        const dateStart = attendanceUTCDate;
        const dateEnd = new Date(Date.UTC(attendanceUTCDate.getUTCFullYear(), attendanceUTCDate.getUTCMonth(), attendanceUTCDate.getUTCDate() + 1));
        const [existingAttendance, studentStatus] = yield prisma.$transaction([
            prisma.attendance.findFirst({
                where: {
                    studentId: +studentId,
                    date: { gte: dateStart, lt: dateEnd },
                },
            }),
            prisma.attendance.findFirst({
                where: { studentId: +studentId },
                orderBy: { created_at: "desc" },
            }),
        ]);
        if (existingAttendance) {
            return res.status(409).json({
                message: `Attendance already recorded for ${attendanceUTCDate.toISOString().split("T")[0]}`,
                existingRecord: {
                    status: existingAttendance.present ? "Present" : "Absent",
                    time: existingAttendance.date.toISOString(),
                },
                errorCode: "DUPLICATE_ATTENDANCE",
            });
        }
        if (!present && (studentStatus === null || studentStatus === void 0 ? void 0 : studentStatus.remark) === "SICK_LEAVE") {
            return res.status(400).json({
                message: "Cannot mark absent for students on sick leave",
                errorCode: "INVALID_STATUS_ACTION",
            });
        }
        const newAttendance = yield prisma.attendance.create({
            data: {
                studentId: +studentId,
                userId: user.useId,
                present,
                remark: present ? "Present" : remark,
                date: attendanceDate,
            },
        });
        if (!present) {
            yield prisma.student.update({
                where: { id: +studentId },
                data: { absentCount: { increment: 1 } },
            });
            // ✅ Send parent WhatsApp message
            if (student.phone) {
                yield (0, sendTwilioMessage_1.sendParentAbsenceMessage)(student.phone, student.fullname, remark, attendanceUTCDate.toISOString().split("T")[0]);
            }
        }
        res.status(201).json({
            success: true,
            message: `Student marked as ${present ? "Present" : "Absent"} for ${attendanceUTCDate.toISOString().split("T")[0]}`,
            attendance: {
                id: newAttendance.id,
                status: newAttendance.present ? "Present" : "Absent",
                date: newAttendance.date.toISOString(),
            },
        });
    }
    catch (error) {
        console.error("Attendance error:", error);
        res.status(500).json({
            message: "Internal server error",
            errorCode: "SERVER_ERROR",
        });
    }
});
exports.markAttendance = markAttendance;
const markViaFingerprint = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, timestamp } = req.body;
        if (!studentId || !timestamp) {
            return res
                .status(400)
                .json({ message: "Missing studentId or timestamp" });
        }
        const attendanceDate = new Date(timestamp);
        // Check if FingerUser exists
        const fingerUser = yield prisma.user.findFirst({
            where: { username: "fingerprint" },
        });
        if (!fingerUser) {
            return res
                .status(500)
                .json({ message: "Fingerprint user not found in system" });
        }
        // Check for existing attendance on the same day
        const startOfDay = new Date(attendanceDate);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);
        const existing = yield prisma.attendance.findFirst({
            where: {
                studentId: +studentId,
                date: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
        });
        if (existing) {
            return res.status(409).json({
                message: `Attendance already recorded for ${startOfDay.toISOString().split("T")[0]}`,
                existingRecord: {
                    status: existing.present ? "Present" : "Absent",
                    time: existing.date.toISOString(),
                },
                errorCode: "DUPLICATE_ATTENDANCE",
            });
        }
        // Record new attendance
        const newAttendance = yield prisma.attendance.create({
            data: {
                studentId: +studentId,
                present: true,
                remark: "Present - Fingerprint",
                date: attendanceDate,
                userId: fingerUser.id,
            },
        });
        res.status(201).json({
            message: "Attendance marked via fingerprint successfully",
            attendance: {
                id: newAttendance.id,
                studentId: newAttendance.studentId,
                date: newAttendance.date.toISOString(),
                status: "Present",
            },
        });
    }
    catch (error) {
        console.error("Fingerprint attendance error:", error);
        res
            .status(500)
            .json({ message: "Failed to mark attendance via fingerprint" });
    }
});
exports.markViaFingerprint = markViaFingerprint;
const getTopAbsentStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // 1. Fetch all active students
        const students = yield prisma.student.findMany({
            where: {
                isdeleted: false,
            },
            select: {
                id: true,
                fullname: true,
            },
        });
        // 2. Count how many times present: false for each student
        const results = yield Promise.all(students.map((student) => __awaiter(void 0, void 0, void 0, function* () {
            const totalAbsences = yield prisma.attendance.count({
                where: {
                    studentId: student.id,
                    present: false, // ✅ base the count on this flag
                },
            });
            const recentAbsences = yield prisma.attendance.findMany({
                where: {
                    studentId: student.id,
                    present: false,
                },
                orderBy: {
                    date: "desc",
                },
                take: 5,
                select: {
                    date: true,
                    remark: true,
                },
            });
            return {
                id: student.id,
                name: student.fullname,
                totalAbsences,
                recentAbsences: recentAbsences.map((entry) => ({
                    date: entry.date.toISOString().split("T")[0],
                    remark: entry.remark,
                    ID: student.id,
                })),
            };
        })));
        // 3. Sort by highest totalAbsences and return top 5
        const sorted = results
            .sort((a, b) => b.totalAbsences - a.totalAbsences)
            .slice(0, 5);
        // 4. Response
        res.status(200).json({
            success: true,
            data: sorted,
        });
    }
    catch (error) {
        console.error("Error fetching absent students:", error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve absent students",
            error: error instanceof Error ? error.message : String(error),
        });
    }
});
exports.getTopAbsentStudents = getTopAbsentStudents;
const updateStudentAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendanceId = +req.params.id;
        const { present, remark } = req.body;
        if (typeof present !== "boolean") {
            return res.status(400).json({
                message: "Invalid attendance status format",
            });
        }
        if (!present && (!remark || remark.trim().length === 0)) {
            return res.status(400).json({
                message: "Remark is required for absent records",
                errorCode: "REMARK_REQUIRED",
            });
        }
        const existingRecord = yield prisma.attendance.findUnique({
            where: { id: attendanceId },
        });
        if (!existingRecord) {
            return res.status(404).json({
                message: "Attendance record not found",
                errorCode: "RECORD_NOT_FOUND",
            });
        }
        // Update attendance record
        const updatedAttendance = yield prisma.attendance.update({
            where: { id: attendanceId },
            data: {
                present,
                remark: present ? "Present" : remark,
            },
        });
        res.status(200).json({
            success: true,
            message: `Attendance updated to ${present ? "Present" : "Absent"}`,
            attendance: {
                id: updatedAttendance.id,
                status: updatedAttendance.present ? "Present" : "Absent",
                date: updatedAttendance.date.toISOString(),
            },
        });
    }
    catch (error) {
        console.error("Update attendance error:", error);
        res.status(500).json({
            message: "Internal server error",
            errorCode: "SERVER_ERROR",
        });
    }
});
exports.updateStudentAttendance = updateStudentAttendance;
const getAbsentStudentsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        if (!date) {
            return res
                .status(400)
                .json({ message: "Date is required as a query parameter" });
        }
        const inputDate = new Date(date);
        if (isNaN(inputDate.getTime())) {
            return res.status(400).json({ message: "Invalid date format" });
        }
        // Convert to UTC range: [00:00, 23:59] of the selected day
        const startOfDay = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate()));
        const endOfDay = new Date(Date.UTC(inputDate.getUTCFullYear(), inputDate.getUTCMonth(), inputDate.getUTCDate() + 1));
        // Get all absent records on that date
        const absentRecords = yield prisma.attendance.findMany({
            where: {
                present: false,
                date: {
                    gte: startOfDay,
                    lt: endOfDay,
                },
            },
            include: {
                student: {
                    select: {
                        id: true,
                        fullname: true,
                        classId: true,
                    },
                },
            },
            orderBy: {
                date: "asc",
            },
        });
        const formatted = absentRecords.map((record) => ({
            studentId: record.student.id,
            fullname: record.student.fullname,
            classId: record.student.classId,
            remark: record.remark,
            date: record.date.toISOString().split("T")[0],
        }));
        res.status(200).json({
            success: true,
            date: startOfDay.toISOString().split("T")[0],
            absentStudents: formatted,
        });
    }
    catch (error) {
        console.error("Error fetching absent students by date:", error);
        res.status(500).json({
            message: "Failed to retrieve absent students",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getAbsentStudentsByDate = getAbsentStudentsByDate;
const markAbsenteesBulk = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { studentIds, date } = req.body;
        if (!Array.isArray(studentIds) || !date) {
            return res
                .status(400)
                .json({ message: "Invalid request. Provide studentIds and date." });
        }
        const utcDate = new Date(date);
        const nextDate = new Date(utcDate);
        nextDate.setDate(utcDate.getDate() + 1);
        const existingRecords = yield prisma.attendance.findMany({
            where: {
                studentId: { in: studentIds },
                date: { gte: utcDate, lt: nextDate },
            },
            select: { studentId: true },
        });
        const alreadyMarked = new Set(existingRecords.map((r) => r.studentId));
        const filteredIds = studentIds.filter((id) => !alreadyMarked.has(id));
        if (!filteredIds.length) {
            return res.status(409).json({
                message: "All selected students are already marked absent for this date.",
            });
        }
        // @ts-ignore — replace with actual user from auth middleware
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.useId) || 1;
        const data = filteredIds.map((studentId) => ({
            studentId,
            userId,
            present: false,
            remark: "Marked absent via bulk tool",
            date: new Date(date),
        }));
        yield prisma.attendance.createMany({ data });
        res.status(201).json({
            success: true,
            message: `${data.length} absentees marked for ${date}`,
        });
    }
    catch (err) {
        console.error("Bulk Absence Error:", err);
        res.status(500).json({
            message: "Server error while marking absentees",
            errorCode: "BULK_ATTENDANCE_ERROR",
        });
    }
});
exports.markAbsenteesBulk = markAbsenteesBulk;
// get attendence list
const getAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        const { date, present } = req.query;
        const whereClause = {
            studentId,
        };
        // Optional: filter by date
        if (date) {
            const selectedDate = new Date(date);
            selectedDate.setHours(0, 0, 0, 0);
            const nextDate = new Date(selectedDate);
            nextDate.setDate(nextDate.getDate() + 1);
            whereClause.date = {
                gte: selectedDate,
                lt: nextDate,
            };
        }
        // Optional: filter by present/absent
        if (present !== undefined) {
            whereClause.present = present === "true";
        }
        const attendance = yield prisma.attendance.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        fullName: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
        });
        res.status(200).json({ records: attendance });
    }
    catch (error) {
        console.error("Error fetching attendance:", error);
        res.status(500).json({ message: "Server error while fetching attendance" });
    }
});
exports.getAttendance = getAttendance;
// get allAbsent
const getAllAbsenteesByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "Date is required" });
        }
        const selectedDate = new Date(date);
        selectedDate.setHours(0, 0, 0, 0);
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + 1);
        const absentees = yield prisma.attendance.findMany({
            where: {
                date: {
                    gte: selectedDate,
                    lt: nextDate,
                },
                present: false,
            },
            include: {
                student: {
                    select: {
                        fullname: true,
                        id: true,
                    },
                },
                user: {
                    select: {
                        fullName: true,
                    },
                },
            },
            orderBy: {
                date: "desc",
            },
        });
        res.status(200).json({ records: absentees });
    }
    catch (error) {
        console.error("Error fetching absentees:", error);
        res.status(500).json({ message: "Server error while fetching absentees" });
    }
});
exports.getAllAbsenteesByDate = getAllAbsenteesByDate;
const updateAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, present, remark, attedenceId } = req.body;
        // Validate presence and remark
        if (typeof present !== "boolean" || !remark) {
            return res
                .status(400)
                .json({ message: "Both present (boolean) and remark are required" });
        }
        // Ensure the student exists
        const student = yield prisma.student.findUnique({
            where: { id: +studentId },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // @ts-ignore
        const user = req.user;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Check if attendance for the student on the same date exists
        const existingAttendance = yield prisma.attendance.findFirst({
            where: {
                studentId: +studentId,
                id: attedenceId,
            },
        });
        if (!existingAttendance) {
            return res.status(404).json({
                message: "No attendance record found for this student today. Use the create endpoint instead.",
            });
        }
        // Update the existing attendance record
        const updatedAttendance = yield prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: {
                present,
                remark,
                userId: user.useId, // Update the user who modified the attendance
            },
        });
        res.status(200).json({
            message: "Attendance updated successfully",
            attendance: updatedAttendance,
        });
    }
    catch (error) {
        console.error("Error updating attendance:", error);
        res.status(500).json({ message: "Server error while updating attendance" });
    }
});
exports.updateAttendance = updateAttendance;
// delete existing attendance
const deleteAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const attendanceId = req.body; // Extract attendanceId from URL params
        // Validate attendanceId
        if (!attendanceId) {
            return res
                .status(400)
                .json({ message: "Valid attendanceId is required" });
        }
        // Check if the attendance record exists
        const existingAttendance = yield prisma.attendance.findUnique({
            where: { id: +attendanceId },
        });
        if (!existingAttendance) {
            return res.status(404).json({ message: "Attendance record not found" });
        }
        // Delete the attendance record
        const attendance = yield prisma.attendance.delete({
            where: { id: attendanceId },
        });
        res.status(200).json({
            message: "Attendance record deleted successfully",
            result: attendance,
        });
    }
    catch (error) {
        console.error("Error deleting attendance:", error);
        res.status(500).json({ message: "Server error while deleting attendance" });
    }
});
exports.deleteAttendance = deleteAttendance;
// Permanently delete multiple students by ID range
const deleteMultipleStudentsPermanently = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startId, endId } = req.body;
        if (!startId || !endId || isNaN(startId) || isNaN(endId)) {
            return res.status(400).json({
                message: "startId and endId are required and must be valid numbers",
            });
        }
        const deleted = yield prisma.student.deleteMany({
            where: {
                id: {
                    gte: Number(startId),
                    lte: Number(endId),
                },
            },
        });
        res.status(200).json({
            message: `Students from ID ${startId} to ${endId} permanently deleted.`,
            count: deleted.count,
        });
    }
    catch (error) {
        console.error("Error permanently deleting students:", error);
        res.status(500).json({
            message: "Server error while permanently deleting students",
        });
    }
});
exports.deleteMultipleStudentsPermanently = deleteMultipleStudentsPermanently;
const deleteStudentAndRelations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const studentId = Number(req.params.id);
        const student = yield prisma.student.findUnique({
            where: { id: studentId },
        });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        // Transaction to delete all related records
        yield prisma.$transaction([
            prisma.attendance.deleteMany({ where: { studentId } }),
            prisma.studentFee.deleteMany({ where: { studentId } }),
            prisma.payment.deleteMany({ where: { studentId } }),
            prisma.discipline.deleteMany({ where: { studentId } }), // 👈 Discipline added here
            prisma.studentAccount.deleteMany({ where: { studentId } }), // 👈 Discipline added here
            prisma.score.deleteMany({ where: { studentId } }), // 👈 Discipline added here
            prisma.paymentAllocation.deleteMany({ where: { studentId } }), // 👈 Discipline added here
            prisma.student.delete({ where: { id: studentId } }),
        ]);
        res.status(200).json({
            message: "Student and all related records deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting student and related records:", error);
        res
            .status(500)
            .json({ message: "Server error while deleting student and relations" });
    }
});
exports.deleteStudentAndRelations = deleteStudentAndRelations;
const getRegisteredStudentsForDevice = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield prisma.student.findMany({
            where: {
                isdeleted: false,
            },
            select: {
                id: true,
                fullname: true,
            },
        });
        res.status(200).json({ success: true, students });
    }
    catch (error) {
        console.error("Failed to fetch students:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getRegisteredStudentsForDevice = getRegisteredStudentsForDevice;
const getStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield prisma.student.findMany({
            where: { isdeleted: false },
            include: {
                classes: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        username: true,
                    },
                },
                StudentFee: true,
                Payment: true,
            },
        });
        res.status(200).json(students);
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({ message: "Server error while fetching students" });
    }
});
exports.getStudents = getStudents;
const getTodayAbsentStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
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
                        id: true,
                        fullname: true,
                        classId: true,
                        classes: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        const formatted = absentees.map((entry) => {
            var _a, _b;
            return ({
                studentId: entry.student.id,
                fullname: entry.student.fullname,
                classId: entry.student.classId,
                className: (_b = (_a = entry.student.classes) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "Unknown",
                remark: entry.remark,
            });
        });
        res.status(200).json({
            success: true,
            date: startOfDay.toISOString().split("T")[0],
            totalAbsent: formatted.length,
            students: formatted,
        });
    }
    catch (error) {
        console.error("Error fetching today's absentees:", error);
        res.status(500).json({ message: "Failed to fetch today's absentees" });
    }
});
exports.getTodayAbsentStudents = getTodayAbsentStudents;
// export const getBrothersList = async (req: Request, res: Response) => {
//   try {
//     // 1. Group all students by parentUserId
//     const grouped = await prisma.student.groupBy({
//       by: ["parentUserId"],
//       _count: {
//         parentUserId: true,
//       },
//       where: {
//         parentUserId: { not: null },
//       },
//     });
//     // 2. Include all parentUserIds with at least 1 student
//     const parentIds = grouped.map((group) => group.parentUserId as number);
//     // 3. Get all students under those parentUserIds
//     const brothers = await prisma.student.findMany({
//       where: {
//         parentUserId: { in: parentIds },
//         isdeleted: false,
//       },
//       include: {
//         parentUser: {
//           select: {
//             id: true,
//             fullName: true,
//             phoneNumber: true,
//           },
//         },
//         classes: {
//           select: { name: true },
//         },
//       },
//       orderBy: {
//         parentUserId: "asc",
//       },
//     });
//     // 4. Group by parent ID for neat response
//     const groupedBrothers: Record<number, any[]> = {};
//     for (const student of brothers) {
//       const parentId = student.parentUserId!;
//       if (!groupedBrothers[parentId]) {
//         groupedBrothers[parentId] = [];
//       }
//       groupedBrothers[parentId].push(student);
//     }
//     res.status(200).json({
//       success: true,
//       message: "Students grouped by parent",
//       data: groupedBrothers,
//     });
//   } catch (error) {
//     console.error("Error fetching students:", error);
//     res.status(500).json({
//       message: "Server error while fetching students",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const getBrothersList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Ensure the user is authenticated and is a parent
        //@ts-ignore
        const parentUserId = req.user.useId;
        if (!parentUserId) {
            return res
                .status(401)
                .json({ message: "Unauthorized. Parent not found." });
        }
        // Get all students for the logged-in parent
        const students = yield prisma.student.findMany({
            where: {
                parentUserId: parentUserId,
                isdeleted: false,
            },
            include: {
                parentUser: {
                    select: {
                        id: true,
                        fullName: true,
                        phoneNumber: true,
                    },
                },
                classes: {
                    select: { name: true },
                },
            },
            orderBy: {
                fullname: "asc",
            },
        });
        res.status(200).json({
            success: true,
            message: "Students grouped by parent",
            data: {
                [parentUserId]: students,
            },
        });
    }
    catch (error) {
        console.error("Error fetching students:", error);
        res.status(500).json({
            message: "Server error while fetching students",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getBrothersList = getBrothersList;
const getStudentsByFamilyNameWritten = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { familyName } = req.query;
        if (!familyName || typeof familyName !== "string") {
            return res
                .status(400)
                .json({ message: "familyName is required in query" });
        }
        const students = yield prisma.student.findMany({
            where: {
                familyName: {
                    contains: familyName.trim(), // ✅ allows partial match
                    mode: "insensitive", // ✅ case insensitive
                },
                isdeleted: false,
            },
            select: {
                id: true,
                firstname: true,
                middlename: true,
                lastname: true,
                fourtname: true,
                fullname: true,
                familyName: true,
                classId: true,
                classes: { select: { name: true } },
            },
        });
        res.status(200).json({
            success: true,
            query: familyName,
            count: students.length,
            students,
        });
    }
    catch (error) {
        console.error("Error fetching by written family name:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getStudentsByFamilyNameWritten = getStudentsByFamilyNameWritten;
// Get attendance records for all students under a parent (by parentUserId)
// export const getParentStudentAttendance = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     // @ts-ignore
//     const user = req.user;
//     if (!user || user.role !== "PARENT") {
//       return res.status(403).json({
//         message: "Access denied. Only parents can access this data.",
//       });
//     }
//     const parentUserId = user.useId;
//     const students = await prisma.student.findMany({
//       where: {
//         parentUserId,
//         isdeleted: false,
//       },
//       select: {
//         id: true,
//         fullname: true,
//         classes: { select: { name: true } },
//         Attendance: {
//           orderBy: { date: "desc" },
//           select: {
//             id: true,
//             date: true,
//             present: true,
//             remark: true,
//           },
//         },
//       },
//     });
//     if (!students.length) {
//       return res.status(404).json({
//         message: "No students found for this parent",
//       });
//     }
//     res.status(200).json({
//       success: true,
//       message: "Attendance records fetched successfully",
//       data: students,
//     });
//   } catch (error) {
//     console.error("Error fetching parent student attendance:", error);
//     res.status(500).json({
//       message: "Server error while fetching attendance",
//       error: error instanceof Error ? error.message : "Unknown error",
//     });
//   }
// };
const getParentStudentAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
                classes: { select: { name: true } },
                Attendance: {
                    orderBy: { date: "desc" },
                    select: {
                        id: true,
                        date: true,
                        present: true,
                        remark: true,
                    },
                },
            },
        });
        if (!students.length) {
            return res.status(404).json({
                message: "No students found for this parent",
            });
        }
        // Calculate total present/absent per student
        const result = students.map((student) => {
            const totalPresent = student.Attendance.filter((a) => a.present).length;
            const totalAbsent = student.Attendance.filter((a) => !a.present).length;
            return Object.assign(Object.assign({}, student), { totalPresent,
                totalAbsent });
        });
        res.status(200).json({
            success: true,
            message: "Attendance records fetched successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Error fetching parent student attendance:", error);
        res.status(500).json({
            message: "Server error while fetching attendance",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.getParentStudentAttendance = getParentStudentAttendance;
const updateStudentParent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { studentId, parentPhone } = req.body;
        if (!studentId || !parentPhone) {
            return res
                .status(400)
                .json({ message: "studentId and parentPhone are required" });
        }
        // Find existing parent by phone
        let parentUser = yield prisma.user.findFirst({
            where: {
                phoneNumber: parentPhone,
                role: "PARENT",
            },
        });
        // If no parent exists, create one
        if (!parentUser) {
            const hashedPassword = yield bcryptjs_1.default.hash(parentPhone, 10);
            const defaultName = `Parent_${parentPhone.slice(-4)}`;
            const username = `parent_${parentPhone.slice(-4)}`;
            const email = `${username}@parent.school.com`;
            parentUser = yield prisma.user.create({
                data: {
                    fullName: defaultName,
                    username,
                    email,
                    phoneNumber: parentPhone,
                    password: hashedPassword,
                    confirmpassword: hashedPassword,
                    role: "PARENT",
                },
            });
        }
        // Update the student's parentUserId
        const updatedStudent = yield prisma.student.update({
            where: { id: Number(studentId) },
            data: {
                parentUserId: parentUser.id,
            },
        });
        res.status(200).json({
            message: "Parent user linked successfully",
            student: updatedStudent,
            parentUser: {
                id: parentUser.id,
                username: parentUser.username,
                email: parentUser.email,
                phoneNumber: parentUser.phoneNumber,
            },
        });
    }
    catch (error) {
        console.error("Error updating student parent:", error);
        res.status(500).json({
            message: "Failed to update student's parent",
            error: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
exports.updateStudentParent = updateStudentParent;
//student with same Bus
// export const getStudentsWithSameBus = async (req: Request, res: Response) => {
//   try {
//     const studentId = Number(req.params.id);
//     // Step 1: Find the target student's bus
//     const targetStudent = await prisma.student.findUnique({
//       where: { id: studentId },
//       select: { bus: true },
//     });
//     if (!targetStudent || !targetStudent.bus) {
//       return res.status(404).json({ message: "Student or bus not found" });
//     }
//     const busName = targetStudent.bus;
//     // Step 2: Find all students with the same bus (excluding the current student if needed)
//     const students = await prisma.student.findMany({
//       where: {
//         bus: busName,
//         isdeleted: false,
//       },
//       select: {
//         id: true,
//         fullname: true,
//         classId: true,
//         bus: true,
//         classes: {
//           select: { name: true },
//         },
//       },
//       orderBy: {
//         fullname: "asc",
//       },
//     });
//     res.status(200).json({
//       success: true,
//       bus: busName,
//       count: students.length,
//       students,
//     });
//   } catch (error) {
//     console.error("Error fetching students with same bus:", error);
//     res.status(500).json({
//       message: "Server error while fetching students with same bus",
//     });
//   }
// };
const getStudentsWithSameBus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const busNumber = req.params.bus; // expecting a number like "1", "22", etc.
        if (!busNumber) {
            return res.status(400).json({ message: "Bus number is required" });
        }
        const students = yield prisma.student.findMany({
            where: {
                bus: busNumber,
                isdeleted: false,
            },
            select: {
                id: true,
                fullname: true,
                classId: true,
                bus: true,
                classes: {
                    select: { name: true },
                },
            },
            orderBy: {
                fullname: "asc",
            },
        });
        if (students.length === 0) {
            return res
                .status(404)
                .json({ message: "No students found for this bus" });
        }
        res.status(200).json({
            success: true,
            bus: busNumber,
            count: students.length,
            students,
        });
    }
    catch (error) {
        console.error("Error fetching students by bus number:", error);
        res.status(500).json({
            message: "Server error while fetching students by bus",
        });
    }
});
exports.getStudentsWithSameBus = getStudentsWithSameBus;
// GET /api/students/by-parent-phone/:phone
const getLastStudentByParentPhone = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const phone = req.params.phone;
        const parent = yield prisma.user.findFirst({
            where: { phoneNumber: phone, role: "PARENT" },
        });
        if (!parent) {
            return res.status(404).json({ message: "Parent not found" });
        }
        const lastStudent = yield prisma.student.findFirst({
            where: { parentUserId: parent.id },
        });
        if (!lastStudent) {
            return res
                .status(404)
                .json({ message: "No students found for this parent" });
        }
        res.status(200).json({
            student: lastStudent,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Server error", error });
    }
});
exports.getLastStudentByParentPhone = getLastStudentByParentPhone;

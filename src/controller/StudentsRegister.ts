import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { sendParentAbsenceMessage } from "./sendTwilioMessage"; // make sure path is correct

const prisma = new PrismaClient();
import multer from "multer";
import * as XLSX from "xlsx";
import bcryptjs from "bcryptjs";

// const upload = multer({ dest: "uploads/" }); // store uploaded files temporarily
const upload = multer({
  storage: multer.memoryStorage(),
});

// Create Student

export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      fourtname,
      classId,
      phone,
      phone2,
      bus,
      address,
      previousSchool,
      previousSchoolType,
      motherName,
      gender,
      age,
      fee,
      district,
      transfer,
      parentEmail,
      academicYearId, // optional
    } = req.body;

    // @ts-ignore
    const user = req.user;

    const fullname = `${firstname} ${middlename} ${lastname} ${
      fourtname || ""
    }`.trim();
    const familyName = ["Reer", middlename, lastname, fourtname]
      .filter(Boolean)
      .join(" ");
    const username = `${lastname.toLowerCase()}_${phone.slice(-4)}`;
    const email = `${username}@parent.school.com`;

    // Check if parent exists or create one
    let parentUser = await prisma.user.findFirst({
      where: {
        phoneNumber: phone,
        role: "PARENT",
      },
    });

    if (!parentUser) {
      const hashedPassword = await bcryptjs.hash(phone, 10);
      parentUser = await prisma.user.create({
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

    // Generate roll number like STU-2025-0001
    const studentCount = await prisma.student.count();
    const year = new Date().getFullYear();
    const rollNumber = `STU-${year}-${String(studentCount + 1).padStart(
      4,
      "0"
    )}`;

    const result = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          firstname,
          middlename,
          lastname,
          fourtname,
          fullname,
          familyName,
          phone,
          phone2,
          bus,
          address,
          previousSchool,
          previousSchoolType: previousSchoolType || "NOT_SPECIFIC",
          motherName,
          gender,
          Age: Number(age),
          fee: Number(fee),
          district,
          transfer: Boolean(transfer),
          parentEmail,
          rollNumber,
          academicYearId: academicYearId || 1,
          registeredById: user.useId,
          userid: user.useId,
          parentUserId: parentUser.id,
          classId: Number(classId), // ✅ correct usage of relation
        },
      });

      const today = new Date();

      await tx.studentFee.create({
        data: {
          studentId: newStudent.id,
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          isPaid: false,
        },
      });

      await tx.studentAccount.create({
        data: {
          studentId: newStudent.id,
          carryForward: 0,
        },
      });

      return newStudent;
    });

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
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({
      message: "Server error while creating student",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const createMultipleStudents = async (req: Request, res: Response) => {
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
      const {
        firstname,
        middlename,
        lastname,
        fourtname,
        classId,
        phone,
        phone2,
        bus,
        address,
        previousSchool,
        previousSchoolType,
        motherName,
        gender,
        Age,
        fee,
        district,
        transfer,
        parentEmail,
        academicYearId,
      } = studentData;

      // Check for duplicates by phone
      const existing = await prisma.student.findFirst({ where: { phone } });
      if (existing) {
        return res.status(400).json({
          message: `Phone number ${phone} already exists.`,
        });
      }

      const fullname = `${firstname} ${middlename} ${lastname} ${
        fourtname || ""
      }`.trim();
      const familyName = ["Reer", middlename, lastname, fourtname]
        .filter(Boolean)
        .join(" ");
      const username = `${lastname.toLowerCase()}_${phone.slice(-4)}`;
      const email = `${username}@parent.school.com`;

      // Create or reuse parent
      let parentUser = await prisma.user.findFirst({
        where: {
          phoneNumber: phone,
          role: "PARENT",
        },
      });

      if (!parentUser) {
        const hashedPassword = await bcryptjs.hash(phone, 10);
        parentUser = await prisma.user.create({
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

      // Generate roll number like STU-2025-0005
      const studentCount = await prisma.student.count();
      const year = new Date().getFullYear();
      const rollNumber = `STU-${year}-${String(studentCount + 1).padStart(
        4,
        "0"
      )}`;

      // Create student + related data
      const newStudent = await prisma.student.create({
        data: {
          firstname,
          middlename,
          lastname,
          fourtname,
          fullname,
          familyName,
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
          district,
          transfer: Boolean(transfer),
          parentEmail,
          rollNumber,
          academicYearId: academicYearId || 1,
          registeredById: user.useId,
          userid: user.useId,
          parentUserId: parentUser.id,
        },
      });

      const today = new Date();
      await prisma.studentFee.create({
        data: {
          studentId: newStudent.id,
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          isPaid: false,
        },
      });

      await prisma.studentAccount.create({
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
  } catch (error) {
    console.error("Error creating multiple students:", error);
    res.status(500).json({
      message: "Server error while creating students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
export const createMultipleStudentsByExcel = async (
  req: Request,
  res: Response
) => {
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
    const skippedStudents: { row: number; reason: string }[] = [];

    for (let i = 0; i < studentsData.length; i++) {
      const row = studentsData[i];
      const {
        firstname,
        middlename,
        lastname,
        fourtname,
        classId,
        phone,
        phone2,
        bus,
        address,
        previousSchool,
        previousSchoolType,
        motherName,
        gender,
        Age,
        fee,
        district,
        transfer,
        parentEmail,
        academicYearId,
      } = row as any;

      const rowIndex = i + 2;

      if (
        !firstname ||
        !lastname ||
        !classId ||
        !phone ||
        !gender ||
        !Age ||
        !fee
      ) {
        skippedStudents.push({
          row: rowIndex,
          reason:
            "Missing required fields (firstname, lastname, classId, phone, gender, age, fee)",
        });
        continue;
      }

      const phoneStr = String(phone).trim();
      const busStr = bus ? String(bus).trim() : null;
      const phone2Str = phone2 ? String(phone2).trim() : null;
      const fullName = `${firstname} ${middlename || ""} ${lastname} ${
        fourtname || ""
      }`.trim();
      const familyName = ["Reer", middlename, lastname, fourtname]
        .filter(Boolean)
        .join(" ");
      const username = `${lastname.toLowerCase()}_${phoneStr.slice(-4)}`;
      const email = `${username}@parent.school.com`;

      try {
        const existingStudent = await prisma.student.findFirst({
          where: { phone: phoneStr },
        });
        if (existingStudent) {
          skippedStudents.push({
            row: rowIndex,
            reason: "Duplicate phone number",
          });
          continue;
        }

        let parentUser = await prisma.user.findFirst({
          where: { phoneNumber: phoneStr, role: "PARENT" },
        });

        if (!parentUser) {
          const hashedPassword = await bcryptjs.hash(phoneStr, 10);
          parentUser = await prisma.user.create({
            data: {
              fullName: motherName || `${firstname} ${lastname} Parent`,
              username,
              email,
              phoneNumber: phoneStr,
              password: hashedPassword,
              confirmpassword: hashedPassword,
              role: "PARENT",
            },
          });
        }

        // Generate roll number
        const count = await prisma.student.count();
        const currentYear = new Date().getFullYear();
        const rollNumber = `STU-${currentYear}-${String(count + 1).padStart(
          4,
          "0"
        )}`;

        // Create in transaction
        const student = await prisma.$transaction(async (tx) => {
          const newStudent = await tx.student.create({
            data: {
              firstname,
              middlename,
              lastname,
              fourtname,
              fullname: fullName,
              familyName,
              classId: Number(classId),
              phone: phoneStr,
              phone2: phone2Str,
              bus: busStr,
              address,
              previousSchool,
              previousSchoolType: previousSchoolType || "NOT_SPECIFIC",
              motherName,
              gender,
              Age: Number(Age),
              fee: Number(fee),
              district: district || "Unknown",
              transfer: Boolean(transfer),
              parentEmail: parentEmail || "",
              rollNumber,
              academicYearId: academicYearId || 1,
              registeredById: user.useId,
              userid: user.useId,
              parentUserId: parentUser.id,
            },
          });

          const today = new Date();
          await tx.studentFee.create({
            data: {
              studentId: newStudent.id,
              month: today.getMonth() + 1,
              year: today.getFullYear(),
              isPaid: false,
            },
          });

          await tx.studentAccount.create({
            data: {
              studentId: newStudent.id,
              carryForward: 0,
            },
          });

          return newStudent;
        });

        createdStudents.push(student);
      } catch (err) {
        console.error(`Row ${rowIndex} Error:`, err);
        skippedStudents.push({
          row: rowIndex,
          reason: "Database error during student creation",
        });
      }
    }

    res.status(201).json({
      message: `${createdStudents.length} students uploaded successfully.`,
      created: createdStudents.length,
      skipped: skippedStudents.length,
      skippedDetails: skippedStudents,
    });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({
      message: "Server error while uploading students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// export const getStudentById = async (req: Request, res: Response) => {
//   try {
//     const studentId = Number(req.params.id);

//     const student = await prisma.student.findUnique({
//       where: { id: studentId, isdeleted: false },
//       include: {
//         classes: {
//           select: {
//             name: true,
//           },
//         },
//         user: {
//           select: {
//             fullName: true,
//           },
//         },
//       },
//     });

//     if (!student) {
//       return res
//         .status(404)
//         .json({ message: "Student not found please try agian" });
//     }

//     res.status(200).json(student);
//   } catch (error) {
//     console.error("Error fetching student:", error);
//     res.status(500).json({ message: "Server error while fetching student" });
//   }
// };
export const getStudentById = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id;
    const identifier = Number(rawId);

    if (isNaN(identifier)) {
      return res.status(400).json({ message: "Invalid ID: must be a number" });
    }

    const student = await prisma.student.findFirst({
      where: {
        isdeleted: false,
        OR: [
          { id: identifier },
          {
            studentNumber: {
              equals: identifier,
              not: null,
            },
          },
        ],
      },
      include: {
        classes: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ message: "No students found" });
    }

    return res.status(200).json(student);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// export const getStudentByIdOrName = async (req: Request, res: Response) => {
//   try {
//     const query = req.params.query.trim().replace(/\s+/g, " ");
//     const isId = !isNaN(Number(query));

//     const students = await prisma.student.findMany({
//       where: {
//         isdeleted: false,
//         ...(isId
//           ? { id: Number(query) }
//           : {
//               OR: [
//                 { fullname: { contains: query, mode: "insensitive" } },
//                 { firstname: { contains: query, mode: "insensitive" } },
//                 { lastname: { contains: query, mode: "insensitive" } },
//                 {
//                   AND: [
//                     {
//                       firstname: {
//                         contains: query.split(" ")[0],
//                         mode: "insensitive",
//                       },
//                     },
//                     {
//                       lastname: {
//                         contains: query.split(" ").slice(-1)[0],
//                         mode: "insensitive",
//                       },
//                     },
//                   ],
//                 },
//               ],
//             }),
//       },
//       include: {
//         classes: { select: { name: true } },
//         user: { select: { email: true } },
//       },
//     });

//     if (students.length === 0) {
//       return res.status(404).json({ message: "No students found" });
//     }

//     res.status(200).json(students);
//   } catch (error) {
//     console.error("Search error:", error);
//     res.status(500).json({ message: "Search failed" });
//   }
// };

export const getStudentByIdOrName = async (req: Request, res: Response) => {
  try {
    const query = req.params.query.trim().replace(/\s+/g, " ");
    const isId = !isNaN(Number(query));

    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        ...(isId
          ? {
              OR: [{ id: Number(query) }, { studentNumber: Number(query) }],
            }
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
            }),
      },
      include: {
        classes: { select: { name: true } },
        user: { select: { email: true } },
      },
    });

    if (students.length === 0) {
      return res.status(404).json({ message: "No students found" });
    }

    res.status(200).json(students);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Search failed" });
  }
};

export const updateStudent = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const {
      firstname,
      middlename,
      lastname,
      fourtname, // ✅ newly added
      classId,
      phone,
      gender,
      Age,
      fee,
      phone2,
      bus,
      address,
      previousSchool,
      motherName,
      previousSchoolType,
    } = req.body;

    // ✅ full name (can be used for display)
    const fullname = `${firstname} ${middlename || ""} ${lastname || ""} ${
      fourtname || ""
    }`
      .trim()
      .replace(/\s+/g, " ");

    // ✅ family name (your requested format)
    const familyName = `Reer ${middlename || ""} ${lastname || ""} ${
      fourtname || ""
    }`
      .trim()
      .replace(/\s+/g, " ");

    // @ts-ignore
    const user = req.user;

    const updatedStudent = await prisma.student.update({
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
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({ message: "Server error while updating student" });
  }
};

export const updateStudentClass = async (req: Request, res: Response) => {
  try {
    const { studentId, classId } = req.body;

    // Check if both studentId and classId are provided
    if (!studentId || !classId) {
      return res
        .status(400)
        .json({ message: "studentId and classId are required" });
    }

    // Validate that the class exists
    const classExists = await prisma.classes.findUnique({
      where: { id: classId },
    });

    if (!classExists) {
      return res.status(404).json({ message: "Class not found" });
    }

    // Update only the classId of the student
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { classId },
    });

    res.status(200).json({
      message: "Student's class updated successfully",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student's class:", error);
    res
      .status(500)
      .json({ message: "Server error while updating student's class" });
  }
};
// Soft Delete Student
export const deleteStudent = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const student = await prisma.student.findFirst({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    await prisma.student.update({
      where: { id: studentId },
      data: { isdeleted: true },
    });

    res.status(200).json({
      student,
      message: "Student deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Server error while deleting student" });
  }
};

// soft deleted student list
export const listSoftDeletedStudents = async (req: Request, res: Response) => {
  try {
    const softDeletedStudents = await prisma.student.findMany({
      where: {
        isdeleted: true,
      },
    });

    res.status(200).json(softDeletedStudents);
  } catch (error) {
    console.error("Error fetching soft-deleted students:", error);
    res.status(500).json({
      message: "Server error while fetching soft-deleted students",
    });
  }
};
// back student from soft delete
export const backFromSoftDelete = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    // Check if student exists
    const student = await prisma.student.findUnique({
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
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: { isdeleted: false },
    });

    res.status(200).json({
      message: "Student successfully restored",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error restoring student:", error);
    res.status(500).json({
      message: "Server error while restoring student",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
// delete student perminatly

export const deletepermitly = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    // 1. Find the student and their parentUserId
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const parentUserId = student.parentUserId;

    // 2. Delete related records
    await prisma.studentFee.deleteMany({ where: { studentId } });
    await prisma.studentAccount.deleteMany({ where: { studentId } });

    // 3. Delete the student
    await prisma.student.delete({ where: { id: studentId } });

    // 4. If parent ID is null, skip parent deletion
    if (parentUserId === null) {
      console.log("Student had no parent linked, skipping parent deletion.");
      return res
        .status(200)
        .json({ message: "Student deleted (no parent to delete)" });
    }

    // 5. Check if any students remain with this parent
    const remainingStudents = await prisma.student.findMany({
      where: { parentUserId },
    });

    console.log(
      `Remaining students for parent ${parentUserId}:`,
      remainingStudents.length
    );

    if (remainingStudents.length === 0) {
      await prisma.user.delete({
        where: { id: parentUserId },
      });
      console.log(`Deleted parent user with ID: ${parentUserId}`);
    }

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Server error while deleting student" });
  }
};

// class create
export const createclass = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user;
    const { name } = req.body;
    const checkclass = await prisma.classes.findFirst({
      where: { name: name },
    });
    if (checkclass) {
      return res.status(400).json({ message: "Class name already exists" });
    }
    const newClass = await prisma.classes.create({
      data: {
        name: name,
        userid: user.useId,
      },
    });
    res
      .status(201)
      .json({ message: "Class created successfully", class: newClass });
  } catch (error) {
    console.error("Error creating class:", error);
    res.status(500).json({ message: "Server error while creating class" });
  }
};

// find class and its student list.

export const getClasses = async (req: Request, res: Response) => {
  try {
    const classes = await prisma.classes.findMany({
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
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ message: "Server error while fetching classes" });
  }
};
// Get Student from Specific Class
export const getStudentsByClass = async (req: Request, res: Response) => {
  try {
    const { classId } = req.params; // Get classId from request parameters

    const students = await prisma.student.findMany({
      where: { classId: parseInt(classId) }, // Ensure classId is an integer if it's a number
    });

    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error while fetching students" });
  }
};

interface attendance {
  studentId: string;
  present: boolean;
  remark: string;
}

export const markAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, present, remark, date } = req.body as attendance & {
      date?: string;
    };

    const attendanceDate = date ? new Date(date) : new Date();
    const attendanceUTCDate = new Date(
      Date.UTC(
        attendanceDate.getUTCFullYear(),
        attendanceDate.getUTCMonth(),
        attendanceDate.getUTCDate()
      )
    );

    const day = attendanceUTCDate.getUTCDay();
    if (day === 4 || day === 5) {
      return res.status(403).json({
        message:
          "Attendance cannot be marked on Thursdays and Fridays (non-working days)",
        errorCode: "NON_WORKING_DAY",
      });
    }

    const today = new Date();
    const todayUTCDate = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );

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

    const student = await prisma.student.findUnique({
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
    const dateEnd = new Date(
      Date.UTC(
        attendanceUTCDate.getUTCFullYear(),
        attendanceUTCDate.getUTCMonth(),
        attendanceUTCDate.getUTCDate() + 1
      )
    );

    const [existingAttendance, studentStatus] = await prisma.$transaction([
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
        message: `Attendance already recorded for ${
          attendanceUTCDate.toISOString().split("T")[0]
        }`,
        existingRecord: {
          status: existingAttendance.present ? "Present" : "Absent",
          time: existingAttendance.date.toISOString(),
        },
        errorCode: "DUPLICATE_ATTENDANCE",
      });
    }

    if (!present && studentStatus?.remark === "SICK_LEAVE") {
      return res.status(400).json({
        message: "Cannot mark absent for students on sick leave",
        errorCode: "INVALID_STATUS_ACTION",
      });
    }

    const newAttendance = await prisma.attendance.create({
      data: {
        studentId: +studentId,
        userId: user.useId,
        present,
        remark: present ? "Present" : remark,
        date: attendanceDate,
      },
    });

    if (!present) {
      await prisma.student.update({
        where: { id: +studentId },
        data: { absentCount: { increment: 1 } },
      });

      // ✅ Send parent WhatsApp message
      if (student.phone) {
        await sendParentAbsenceMessage(
          student.phone,
          student.fullname,
          remark,
          attendanceUTCDate.toISOString().split("T")[0]
        );
      }
    }

    res.status(201).json({
      success: true,
      message: `Student marked as ${present ? "Present" : "Absent"} for ${
        attendanceUTCDate.toISOString().split("T")[0]
      }`,
      attendance: {
        id: newAttendance.id,
        status: newAttendance.present ? "Present" : "Absent",
        date: newAttendance.date.toISOString(),
      },
    });
  } catch (error) {
    console.error("Attendance error:", error);
    res.status(500).json({
      message: "Internal server error",
      errorCode: "SERVER_ERROR",
    });
  }
};

export const markViaFingerprint = async (req: Request, res: Response) => {
  try {
    const { studentId, timestamp } = req.body;

    if (!studentId || !timestamp) {
      return res
        .status(400)
        .json({ message: "Missing studentId or timestamp" });
    }

    const attendanceDate = new Date(timestamp);

    // Check if FingerUser exists
    const fingerUser = await prisma.user.findFirst({
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

    const existing = await prisma.attendance.findFirst({
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
        message: `Attendance already recorded for ${
          startOfDay.toISOString().split("T")[0]
        }`,
        existingRecord: {
          status: existing.present ? "Present" : "Absent",
          time: existing.date.toISOString(),
        },
        errorCode: "DUPLICATE_ATTENDANCE",
      });
    }

    // Record new attendance
    const newAttendance = await prisma.attendance.create({
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
  } catch (error) {
    console.error("Fingerprint attendance error:", error);
    res
      .status(500)
      .json({ message: "Failed to mark attendance via fingerprint" });
  }
};

export const getTopAbsentStudents = async (req: Request, res: Response) => {
  try {
    // 1. Fetch all active students
    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
      },
      select: {
        id: true,
        fullname: true,
      },
    });

    // 2. Count how many times present: false for each student
    const results = await Promise.all(
      students.map(async (student) => {
        const totalAbsences = await prisma.attendance.count({
          where: {
            studentId: student.id,
            present: false, // ✅ base the count on this flag
          },
        });

        const recentAbsences = await prisma.attendance.findMany({
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
      })
    );

    // 3. Sort by highest totalAbsences and return top 5
    const sorted = results
      .sort((a, b) => b.totalAbsences - a.totalAbsences)
      .slice(0, 5);

    // 4. Response
    res.status(200).json({
      success: true,
      data: sorted,
    });
  } catch (error) {
    console.error("Error fetching absent students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve absent students",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateStudentAttendance = async (req: Request, res: Response) => {
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

    const existingRecord = await prisma.attendance.findUnique({
      where: { id: attendanceId },
    });

    if (!existingRecord) {
      return res.status(404).json({
        message: "Attendance record not found",
        errorCode: "RECORD_NOT_FOUND",
      });
    }

    // Update attendance record
    const updatedAttendance = await prisma.attendance.update({
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
  } catch (error) {
    console.error("Update attendance error:", error);
    res.status(500).json({
      message: "Internal server error",
      errorCode: "SERVER_ERROR",
    });
  }
};

export const getAbsentStudentsByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res
        .status(400)
        .json({ message: "Date is required as a query parameter" });
    }

    const inputDate = new Date(date as string);
    if (isNaN(inputDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Convert to UTC range: [00:00, 23:59] of the selected day
    const startOfDay = new Date(
      Date.UTC(
        inputDate.getUTCFullYear(),
        inputDate.getUTCMonth(),
        inputDate.getUTCDate()
      )
    );
    const endOfDay = new Date(
      Date.UTC(
        inputDate.getUTCFullYear(),
        inputDate.getUTCMonth(),
        inputDate.getUTCDate() + 1
      )
    );

    // Get all absent records on that date
    const absentRecords = await prisma.attendance.findMany({
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
  } catch (error) {
    console.error("Error fetching absent students by date:", error);
    res.status(500).json({
      message: "Failed to retrieve absent students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const markAbsenteesBulk = async (req: Request, res: Response) => {
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

    const existingRecords = await prisma.attendance.findMany({
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
        message:
          "All selected students are already marked absent for this date.",
      });
    }

    // @ts-ignore — replace with actual user from auth middleware
    const userId = req.user?.useId || 1;

    const data = filteredIds.map((studentId: number) => ({
      studentId,
      userId,
      present: false,
      remark: "Marked absent via bulk tool",
      date: new Date(date),
    }));

    await prisma.attendance.createMany({ data });

    res.status(201).json({
      success: true,
      message: `${data.length} absentees marked for ${date}`,
    });
  } catch (err) {
    console.error("Bulk Absence Error:", err);
    res.status(500).json({
      message: "Server error while marking absentees",
      errorCode: "BULK_ATTENDANCE_ERROR",
    });
  }
};

// get attendence list

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const { date, present } = req.query;

    const whereClause: any = {
      studentId,
    };

    // Optional: filter by date
    if (date) {
      const selectedDate = new Date(date as string);
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

    const attendance = await prisma.attendance.findMany({
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
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error while fetching attendance" });
  }
};
// get allAbsent
export const getAllAbsenteesByDate = async (req: Request, res: Response) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const selectedDate = new Date(date as string);
    selectedDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(selectedDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const absentees = await prisma.attendance.findMany({
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
  } catch (error) {
    console.error("Error fetching absentees:", error);
    res.status(500).json({ message: "Server error while fetching absentees" });
  }
};

export const updateAttendance = async (req: Request, res: Response) => {
  try {
    const { studentId, present, remark, attedenceId } = req.body;

    // Validate presence and remark
    if (typeof present !== "boolean" || !remark) {
      return res
        .status(400)
        .json({ message: "Both present (boolean) and remark are required" });
    }

    // Ensure the student exists
    const student = await prisma.student.findUnique({
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
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: +studentId,
        id: attedenceId,
      },
    });

    if (!existingAttendance) {
      return res.status(404).json({
        message:
          "No attendance record found for this student today. Use the create endpoint instead.",
      });
    }

    // Update the existing attendance record
    const updatedAttendance = await prisma.attendance.update({
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
  } catch (error) {
    console.error("Error updating attendance:", error);
    res.status(500).json({ message: "Server error while updating attendance" });
  }
};

// delete existing attendance
export const deleteAttendance = async (req: Request, res: Response) => {
  try {
    const attendanceId = req.body; // Extract attendanceId from URL params

    // Validate attendanceId
    if (!attendanceId) {
      return res
        .status(400)
        .json({ message: "Valid attendanceId is required" });
    }

    // Check if the attendance record exists
    const existingAttendance = await prisma.attendance.findUnique({
      where: { id: +attendanceId },
    });

    if (!existingAttendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Delete the attendance record
    const attendance = await prisma.attendance.delete({
      where: { id: attendanceId },
    });

    res.status(200).json({
      message: "Attendance record deleted successfully",
      result: attendance,
    });
  } catch (error) {
    console.error("Error deleting attendance:", error);
    res.status(500).json({ message: "Server error while deleting attendance" });
  }
};

// Permanently delete multiple students by ID range
export const deleteMultipleStudentsPermanently = async (
  req: Request,
  res: Response
) => {
  try {
    const { startId, endId } = req.body;

    if (!startId || !endId || isNaN(startId) || isNaN(endId)) {
      return res.status(400).json({
        message: "startId and endId are required and must be valid numbers",
      });
    }

    const deleted = await prisma.student.deleteMany({
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
  } catch (error) {
    console.error("Error permanently deleting students:", error);
    res.status(500).json({
      message: "Server error while permanently deleting students",
    });
  }
};

export const deleteStudentAndRelations = async (
  req: Request,
  res: Response
) => {
  try {
    const studentId = Number(req.params.id);

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Transaction to delete all related records
    await prisma.$transaction([
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
  } catch (error) {
    console.error("Error deleting student and related records:", error);
    res
      .status(500)
      .json({ message: "Server error while deleting student and relations" });
  }
};

export const getRegisteredStudentsForDevice = async (
  req: Request,
  res: Response
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
      },
      select: {
        id: true,
        fullname: true,
      },
    });

    res.status(200).json({ success: true, students });
  } catch (error) {
    console.error("Failed to fetch students:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getStudents = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
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
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ message: "Server error while fetching students" });
  }
};

export const getTodayAbsentStudents = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const startOfDay = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const absentees = await prisma.attendance.findMany({
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

    const formatted = absentees.map((entry) => ({
      studentId: entry.student.id,
      fullname: entry.student.fullname,
      classId: entry.student.classId,
      className: entry.student.classes?.name ?? "Unknown",
      remark: entry.remark,
    }));

    res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      totalAbsent: formatted.length,
      students: formatted,
    });
  } catch (error) {
    console.error("Error fetching today's absentees:", error);
    res.status(500).json({ message: "Failed to fetch today's absentees" });
  }
};

export const getBrothersList = async (req: Request, res: Response) => {
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
    const students = await prisma.student.findMany({
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
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      message: "Server error while fetching students",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getStudentsByFamilyNameWritten = async (
  req: Request,
  res: Response
) => {
  try {
    const { familyName } = req.query;

    if (!familyName || typeof familyName !== "string") {
      return res
        .status(400)
        .json({ message: "familyName is required in query" });
    }

    const students = await prisma.student.findMany({
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
  } catch (error) {
    console.error("Error fetching by written family name:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Get attendance records for all students under a parent (by parentUserId)

export const getParentStudentAttendance = async (
  req: Request,
  res: Response
) => {
  try {
    // @ts-ignore
    const user = req.user;

    if (!user || user.role !== "PARENT") {
      return res.status(403).json({
        message: "Access denied. Only parents can access this data.",
      });
    }

    const parentUserId = user.useId;

    const students = await prisma.student.findMany({
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

      return {
        ...student,
        totalPresent,
        totalAbsent,
      };
    });

    res.status(200).json({
      success: true,
      message: "Attendance records fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching parent student attendance:", error);
    res.status(500).json({
      message: "Server error while fetching attendance",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const updateStudentParent = async (req: Request, res: Response) => {
  try {
    const { studentId, parentPhone } = req.body;

    if (!studentId || !parentPhone) {
      return res
        .status(400)
        .json({ message: "studentId and parentPhone are required" });
    }

    // Find existing parent by phone
    let parentUser = await prisma.user.findFirst({
      where: {
        phoneNumber: parentPhone,
        role: "PARENT",
      },
    });

    // If no parent exists, create one
    if (!parentUser) {
      const hashedPassword = await bcryptjs.hash(parentPhone, 10);
      const defaultName = `Parent_${parentPhone.slice(-4)}`;
      const username = `parent_${parentPhone.slice(-4)}`;
      const email = `${username}@parent.school.com`;

      parentUser = await prisma.user.create({
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
    const updatedStudent = await prisma.student.update({
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
  } catch (error) {
    console.error("Error updating student parent:", error);
    res.status(500).json({
      message: "Failed to update student's parent",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

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
export const getStudentsWithSameBus = async (req: Request, res: Response) => {
  try {
    const busNumber = req.params.bus; // expecting a number like "1", "22", etc.

    if (!busNumber) {
      return res.status(400).json({ message: "Bus number is required" });
    }

    const students = await prisma.student.findMany({
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
  } catch (error) {
    console.error("Error fetching students by bus number:", error);
    res.status(500).json({
      message: "Server error while fetching students by bus",
    });
  }
};

// GET /api/students/by-parent-phone/:phone

// export const getLastStudentByParentPhone = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const phone = req.params.phone;

//     const parent = await prisma.user.findFirst({
//       where: { phoneNumber: phone, role: "PARENT" },
//     });

//     if (!parent) {
//       return res.status(404).json({ message: "Parent not found" });
//     }

//     const lastStudent = await prisma.student.findFirst({
//       where: { parentUserId: parent.id },
//       orderBy: { createdAt: "desc" }, // Make sure createdAt exists in your model
//     });

//     if (!lastStudent) {
//       return res
//         .status(404)
//         .json({ message: "No students found for this parent" });
//     }

//     return res.status(200).json({ student: lastStudent });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
export const getLastStudentByParentPhone = async (
  req: Request,
  res: Response
) => {
  try {
    const phone = req.query.phone as string;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required" });
    }

    const parent = await prisma.user.findFirst({
      where: { phoneNumber: phone, role: "PARENT" },
    });

    if (!parent) {
      return res.status(404).json({ message: "Parent not found" });
    }

    const lastStudent = await prisma.student.findFirst({
      where: {
        parentUserId: parent.id,
        isdeleted: false,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastStudent) {
      return res
        .status(404)
        .json({ message: "No students found for this parent" });
    }

    res.status(200).json({ student: lastStudent });
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { upload };

export const getStudentsWithBus = async (req: Request, res: Response) => {
  try {
    const standardSchoolFee = 28;

    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        AND: [{ bus: { not: null } }, { bus: { not: "" } }],
      },
      select: {
        id: true,
        fullname: true,
        fee: true,
        bus: true,
        classId: true,
        classes: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullname: "asc",
      },
    });

    const enrichedStudents = students.map((student) => {
      const totalFee = Number(student.fee) || 0;

      const dynamicSchoolFee =
        totalFee < standardSchoolFee ? totalFee : standardSchoolFee;

      const busFee = totalFee - dynamicSchoolFee;

      return {
        ...student,
        totalFee,
        schoolFee: dynamicSchoolFee,
        busFee,
      };
    });

    const uniqueStudents = enrichedStudents.filter(
      (student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
    );

    res.status(200).json({
      success: true,
      count: uniqueStudents.length,
      students: uniqueStudents,
    });
  } catch (error) {
    console.error("Error fetching students with bus:", error);
    res.status(500).json({
      message: "Server error while fetching students with bus",
    });
  }
};

export const getBusStudentsWithZeroBusFee = async (
  req: Request,
  res: Response
) => {
  try {
    const standardSchoolFee = 28;

    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        AND: [{ bus: { not: null } }, { bus: { not: "" } }],
      },
      select: {
        id: true,
        fullname: true,
        fee: true,
        phone: true, // ✅ Added this line
        bus: true,
        FreeReason: true,
        classId: true,
        classes: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullname: "asc",
      },
    });

    const filteredStudents = students
      .map((student) => {
        const totalFee = Number(student.fee) || 0;
        const dynamicSchoolFee =
          totalFee < standardSchoolFee ? totalFee : standardSchoolFee;
        const busFee = totalFee - dynamicSchoolFee;

        return {
          ...student,
          totalFee,
          schoolFee: dynamicSchoolFee,
          busFee,
        };
      })
      .filter((student) => student.busFee === 0); // only include students who paid no bus fee

    res.status(200).json({
      success: true,
      count: filteredStudents.length,
      students: filteredStudents,
    });
  } catch (error) {
    console.error("Error fetching bus students with zero bus fee:", error);
    res.status(500).json({
      message: "Server error while fetching students",
    });
  }
};

export const getStudentsWithoutBus = async (req: Request, res: Response) => {
  try {
    const schoolFee = 28;

    const students = await prisma.student.findMany({
      where: {
        OR: [{ bus: null }, { bus: "" }],
        isdeleted: false,
      },
      select: {
        id: true,
        fullname: true,
        fee: true,
        bus: true,
        classId: true,
        classes: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullname: "asc",
      },
    });

    const enrichedStudents = students.map((student) => {
      const totalFee = Number(student.fee) || 0;

      return {
        ...student,
        totalFee,
        schoolFee,
        busFee: 0,
      };
    });

    // Deduplicate just in case
    const uniqueStudents = enrichedStudents.filter(
      (student, index, self) =>
        index === self.findIndex((s) => s.id === student.id)
    );

    res.status(200).json({
      success: true,
      count: uniqueStudents.length,
      students: uniqueStudents,
    });
  } catch (error) {
    console.error("Error fetching students without bus:", error);
    res.status(500).json({
      message: "Server error while fetching students without bus",
    });
  }
};

export const updateStudentTransferAndRollNumber = async (
  req: Request,
  res: Response
) => {
  try {
    const { id, transfer, rollNumber } = req.body;

    if (!id) {
      return res.status(400).json({ message: "Student ID is required." });
    }

    // Optional: Validate if rollNumber is already taken
    if (rollNumber) {
      const existingRoll = await prisma.student.findFirst({
        where: { rollNumber },
      });

      if (existingRoll && existingRoll.id !== id) {
        return res.status(409).json({ message: "Roll number already in use." });
      }
    }

    const updatedStudent = await prisma.student.update({
      where: { id: Number(id) },
      data: {
        transfer: Boolean(transfer),
        rollNumber,
      },
    });

    res.status(200).json({
      message: "Student transfer status and roll number updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Error updating student:", error);
    res.status(500).json({
      message: "Server error while updating student",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const listUntransferredStudents = async (
  req: Request,
  res: Response
) => {
  try {
    const students = await prisma.student.findMany({
      where: {
        transfer: false,
      },
      include: {
        classes: {
          select: {
            name: true, // ✅ Correct field
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    const result = students.map((student) => ({
      fullname: student.fullname,
      classname: student.classes.name, // ✅ Corrected field
      phone: student.phone,
      phone2: student.phone2,
      previousSchool: student.previousSchool,
      rollNumber: student.rollNumber,
      transfer: student.transfer,
    }));

    res.status(200).json({
      message: "Untransferred students fetched successfully.",
      students: result,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({
      message: "Server error while fetching students.",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const absentReport = async (req: Request, res: Response) => {
  try {
    // Optional: date filtering from query parameters
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const whereClause = {
      present: false, // Only absences
      ...(startDate || endDate ? { date: dateFilter } : {}),
    };

    // Fetch absent attendance records
    const absentRecords = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: {
          include: {
            classes: true, // get class name
          },
        },
        user: true, // user who recorded the attendance
      },
      orderBy: {
        date: "desc",
      },
    });

    // Format data for the report
    const report = absentRecords.map((record) => ({
      date: record.date,
      remark: record.remark,
      callStatus: record.callStatus,
      callTime: record.callTime,
      callNotes: record.callNotes,

      studentFullName: record.student.fullname,
      className: record.student.classes.name,
      phone: record.student.phone,
      phone2: record.student.phone2,
      studentId: record.student.id,

      recordedBy: record.user.fullName,
    }));

    return res.status(200).json({
      total: report.length,
      report,
    });
  } catch (error) {
    console.error("Absent report error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred while generating the report.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

/**
 * Controller to update call info for a student's attendance record.
 */
export const updateAttendanceCallInfoHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, date, callTime, callStatus, callNotes } = req.body;

    if (!studentId || !date || !callStatus) {
      return res.status(400).json({
        message: "studentId, date, and callStatus are required.",
      });
    }

    // Find the attendance record
    const attendance = await prisma.attendance.findFirst({
      where: {
        studentId: Number(studentId),
        date: new Date(date),
      },
    });

    if (!attendance) {
      return res.status(404).json({
        message: `No attendance record found for studentId=${studentId} on date=${date}`,
      });
    }

    // Update the record
    const updatedRecord = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        callTime: callTime ? new Date(callTime) : new Date(),
        callStatus,
        callNotes,
      },
    });

    return res.status(200).json({
      message: "Call information updated successfully.",
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error updating attendance call info:", error);
    return res.status(500).json({
      message: "An unexpected error occurred.",
    });
  } finally {
    await prisma.$disconnect();
  }
};
export const getClassAttendanceSummary = async (
  req: Request,
  res: Response
) => {
  try {
    // Read month and year from query
    const { month, year } = req.query;

    // Validate month and year
    if (!month || !year) {
      return res.status(400).json({
        message: "Query parameters 'month' and 'year' are required.",
      });
    }

    const monthNum = parseInt(month as string);
    const yearNum = parseInt(year as string);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        message: "Invalid 'month' or 'year' parameter.",
      });
    }

    // Calculate date range
    const startDate = new Date(Date.UTC(yearNum, monthNum - 1, 1));
    const endDate = new Date(Date.UTC(yearNum, monthNum, 1));

    // Get all classes
    const classes = await prisma.classes.findMany({
      include: {
        Student: {
          where: { isdeleted: false },
          select: {
            id: true,
            fullname: true,
          },
        },
      },
    });

    // For each class, calculate attendance stats within the date range
    const result = await Promise.all(
      classes.map(async (cls) => {
        let totalPresent = 0;
        let totalAbsent = 0;

        const studentsWithCounts = await Promise.all(
          cls.Student.map(async (student) => {
            const presentCount = await prisma.attendance.count({
              where: {
                studentId: student.id,
                present: true,
                date: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            });

            const absentCount = await prisma.attendance.count({
              where: {
                studentId: student.id,
                present: false,
                date: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            });

            totalPresent += presentCount;
            totalAbsent += absentCount;

            return {
              studentId: student.id,
              fullname: student.fullname,
              presentCount,
              absentCount,
              totalRecords: presentCount + absentCount,
              attendanceRate:
                presentCount + absentCount > 0
                  ? (
                      (presentCount / (presentCount + absentCount)) *
                      100
                    ).toFixed(2) + "%"
                  : "N/A",
            };
          })
        );

        const overallTotal = totalPresent + totalAbsent;
        const overallRate =
          overallTotal > 0
            ? ((totalPresent / overallTotal) * 100).toFixed(2) + "%"
            : "N/A";

        return {
          classId: cls.id,
          className: cls.name,
          totalStudents: cls.Student.length,
          totalPresentDays: totalPresent,
          totalAbsentDays: totalAbsent,
          overallAttendanceRate: overallRate,
          students: studentsWithCounts,
        };
      })
    );

    res.status(200).json({
      success: true,
      month: monthNum,
      year: yearNum,
      data: result,
    });
  } catch (error) {
    console.error("Error generating class attendance summary:", error);
    res.status(500).json({
      message: "Server error while generating class attendance summary",
    });
  }
};

export const getDailyAttendanceOverview = async (
  req: Request,
  res: Response
) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        message: "Query parameter 'date' is required (YYYY-MM-DD).",
      });
    }

    const targetDate = new Date(date as string);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format." });
    }

    const startOfDay = new Date(
      Date.UTC(
        targetDate.getUTCFullYear(),
        targetDate.getUTCMonth(),
        targetDate.getUTCDate()
      )
    );
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Get all attendance records on that day
    const records = await prisma.attendance.findMany({
      where: {
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
            classes: {
              select: { name: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
      orderBy: {
        student: {
          classId: "asc",
        },
      },
    });

    // Group records by class
    const grouped: Record<
      string,
      {
        classId: number;
        className: string;
        records: {
          studentId: number;
          fullname: string;
          status: "Present" | "Absent";
          remark: string;
          recordedBy: string;
        }[];
      }
    > = {};

    records.forEach((rec) => {
      const classKey = `${rec.student.classId}-${
        rec.student.classes?.name ?? "Unknown"
      }`;

      if (!grouped[classKey]) {
        grouped[classKey] = {
          classId: rec.student.classId,
          className: rec.student.classes?.name ?? "Unknown",
          records: [],
        };
      }

      grouped[classKey].records.push({
        studentId: rec.student.id,
        fullname: rec.student.fullname,
        status: rec.present ? "Present" : "Absent",
        remark: rec.remark ?? "",
        recordedBy: rec.user?.fullName ?? "Unknown",
      });
    });

    res.status(200).json({
      success: true,
      date: startOfDay.toISOString().split("T")[0],
      classes: Object.values(grouped),
    });
  } catch (error) {
    console.error("Error generating daily attendance overview:", error);
    res.status(500).json({
      message: "Server error while generating daily attendance overview",
    });
  }
};

export const getClassMonthlyAttendanceSummary = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId } = req.params;
    const { year } = req.query;

    if (!classId) {
      return res.status(400).json({ message: "classId is required" });
    }

    const targetYear = year ? Number(year) : new Date().getFullYear();

    // 1️⃣ Get all students in the class
    const students = await prisma.student.findMany({
      where: {
        classId: Number(classId),
        isdeleted: false,
      },
      select: {
        id: true,
        fullname: true,
      },
    });

    const summary = [];

    for (const student of students) {
      const records = await prisma.attendance.findMany({
        where: {
          studentId: student.id,
          date: {
            gte: new Date(`${targetYear}-01-01`),
            lte: new Date(`${targetYear}-12-31`),
          },
        },
      });

      const months = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        presentCount: 0,
        absentCount: 0,
      }));

      let totalAbsentCount = 0;

      records.forEach((rec) => {
        const m = new Date(rec.date).getMonth();
        if (rec.present) {
          months[m].presentCount++;
        } else {
          months[m].absentCount++;
          totalAbsentCount++;
        }
      });

      summary.push({
        studentId: student.id,
        fullname: student.fullname,
        totalAbsentCount,
        monthly: months,
      });
    }

    // 2️⃣ Sort descending by total absences
    summary.sort((a, b) => b.totalAbsentCount - a.totalAbsentCount);

    res.status(200).json({
      classId: Number(classId),
      year: targetYear,
      summary,
    });
  } catch (error) {
    console.error("Error fetching class monthly attendance summary:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const softDeleteStudent = async (req: Request, res: Response) => {
  const { studentId, reason } = req.body;

  // 🔐 Extract user ID from token using `useId` as defined in your JWT payload
  //@ts-ignore
  const user = req.user as { useId?: number };
  const userId = user?.useId;

  if (!studentId || !reason || !userId) {
    return res.status(400).json({
      success: false,
      message: "studentId, reason, and valid user token are required.",
    });
  }

  try {
    // Step 1: Soft delete the student
    await prisma.student.update({
      where: { id: studentId },
      data: { isdeleted: true },
    });

    // ✅ Step 2: Log the reason in StudentDeletionLog (use `userId`)
    await prisma.studentDeletionLog.create({
      data: {
        studentId,
        reason,
        userId, // ✔ this is the correct field name
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student marked as deleted and reason recorded.",
    });
  } catch (error) {
    console.error("Soft delete error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error while deleting student.",
    });
  }
};

// controllers/student.controller.ts

// export const listDeletedStudents = async (_req: Request, res: Response) => {
//   try {
//     const deletedStudents = await prisma.studentDeletionLog.findMany({
//       orderBy: { deletedAt: "desc" },
//       include: {
//         Student: {
//           select: {
//             id: true,
//             fullname: true,
//             classes: {
//               select: {
//                 name: true,
//               },
//             },
//           },
//         },
//         User: {
//           select: {
//             id: true,
//             fullName: true,
//             email: true,
//           },
//         },
//       },
//     });

//     const formatted = deletedStudents.map((log) => ({
//       studentId: log.Student.id,
//       fullName: log.Student.fullname,
//       className: log.Student.classes?.name || "N/A",
//       reason: log.reason,
//       deletedAt: log.deletedAt,
//       deletedByUserId: log.User?.id || null,
//       deletedByName: log.User?.fullName || "N/A",
//       deletedByEmail: log.User?.email || "N/A",
//     }));

//     res.status(200).json({
//       success: true,
//       count: formatted.length,
//       deletedStudents: formatted,
//     });
//   } catch (error) {
//     console.error("Error fetching deleted students:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to retrieve deleted students.",
//     });
//   }
// };
export const listDeletedStudents = async (_req: Request, res: Response) => {
  try {
    const deletedStudents = await prisma.studentDeletionLog.findMany({
      orderBy: { deletedAt: "desc" },
      include: {
        Student: {
          select: {
            id: true,
            fullname: true,
            classes: {
              select: {
                name: true,
              },
            },
          },
        },
        deletedByUser: {
          // ✅ corrected relation name
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    const formatted = deletedStudents.map((log) => ({
      studentId: log.Student.id,
      fullName: log.Student.fullname,
      className: log.Student.classes?.name || "N/A",
      reason: log.reason,
      deletedAt: log.deletedAt,
      deletedByUserId: log.deletedByUser?.id || null,
      deletedByName: log.deletedByUser?.fullName || "N/A",
      deletedByEmail: log.deletedByUser?.email || "N/A",
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      deletedStudents: formatted,
    });
  } catch (error) {
    console.error("Error fetching deleted students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve deleted students.",
    });
  }
};

export const restoreDeletedStudent = async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;

    // 🔐 Extract user ID from token
    //@ts-ignore
    const user = req.user as { useId?: number };
    const userId = user?.useId;

    if (!studentId || !userId) {
      return res.status(400).json({
        success: false,
        message: "Student ID and valid user token are required.",
      });
    }

    // Step 1: Check if student exists and is currently soft-deleted
    const existingStudent = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent || !existingStudent.isdeleted) {
      return res.status(404).json({
        success: false,
        message: "Student not found or already active.",
      });
    }

    // Step 2: Restore the student
    await prisma.student.update({
      where: { id: studentId },
      data: { isdeleted: false },
    });

    // Step 3: Update the log entry
    await prisma.student.update({
      where: { id: studentId },
      data: {
        isdeleted: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Student restored successfully and log updated.",
    });
  } catch (error) {
    console.error("Restore error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to restore student.",
    });
  }
};
export const listRestoredStudents = async (_req: Request, res: Response) => {
  try {
    const deletedLogs = await prisma.studentDeletionLog.findMany({
      orderBy: { deletedAt: "desc" },
      include: {
        Student: {
          select: {
            id: true,
            fullname: true,
            classes: {
              select: {
                name: true,
              },
            },
          },
        },
        deletedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    const formatted = deletedLogs.map((log) => ({
      studentId: log.Student.id,
      fullName: log.Student.fullname,
      className: log.Student.classes?.name || "N/A",
      reason: log.reason,
      deletedAt: log.deletedAt,
      deletedBy: {
        id: log.deletedByUser?.id,
        name: log.deletedByUser?.fullName,
        email: log.deletedByUser?.email,
      },
    }));

    res.status(200).json({
      success: true,
      count: formatted.length,
      restoredStudents: formatted, // 🔁 Still using this key in the response for compatibility
    });
  } catch (error) {
    console.error("Error fetching restored (deleted) students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve restored students.",
    });
  }
};

export const getAllClasses = async (_req: Request, res: Response) => {
  try {
    const classes = await prisma.classes.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return res.status(200).json({ classes });
  } catch (error) {
    console.error("Error fetching classes:", error);
    return res.status(500).json({ message: "Failed to fetch classes" });
  }
};

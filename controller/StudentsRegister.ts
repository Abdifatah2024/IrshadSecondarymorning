import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const prisma = new PrismaClient();
import multer from "multer";
import * as XLSX from "xlsx";

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
      classId,
      phone,
      phone2,
      bus,
      address,
      previousSchool,
      motherName,
      gender,
      Age,
      fee,
    } = req.body;

    // @ts-ignore
    const user = req.user;
    const checkStudent = await prisma.student.findFirst({
      where: { phone },
    });
    if (checkStudent) {
      return res.status(400).json({ message: "Phone number already exists" });
    }

    const fullname = `${firstname} ${middlename} ${lastname}`;

    const newStudent = await prisma.student.create({
      data: {
        firstname,
        middlename,
        lastname,
        fullname,
        classId,
        phone,
        gender,
        Age,
        fee,
        bus,
        address,
        phone2,
        previousSchool,
        motherName,
        userid: user.useId,
      },
    });

    res
      .status(201)
      .json({ message: "Student created successfully", student: newStudent });
  } catch (error) {
    console.error("Error creating student:", error);
    res.status(500).json({ message: "Server error while creating student" });
  }
};

// create multiple students
export const createMultipleStudents = async (req: Request, res: Response) => {
  try {
    const studentsData = req.body; // Expecting an array of students

    // Ensure the input is an array of students
    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res
        .status(400)
        .json({ message: "Invalid input, expected an array of students" });
    }

    // @ts-ignore
    const user = req.user;

    const createdStudents = [];

    for (const studentData of studentsData) {
      const {
        firstname,
        middlename,
        lastname,
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
      } = studentData;

      // Check if the student already exists based on phone number
      const checkStudent = await prisma.student.findFirst({
        where: { phone },
      });
      if (checkStudent) {
        return res
          .status(400)
          .json({ message: `Phone number ${phone} already exists` });
      }

      const fullname = `${firstname} ${middlename} ${lastname}`;

      // Create the student record
      const newStudent = await prisma.student.create({
        data: {
          firstname,
          middlename,
          lastname,
          fullname,
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
          userid: user.useId,
        },
      });

      createdStudents.push(newStudent);
    }

    res.status(201).json({
      message: "Students created successfully",
      students: createdStudents,
    });
  } catch (error) {
    console.error("Error creating students:", error);
    res.status(500).json({ message: "Server error while creating students" });
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

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" }); // 🔥 FIX HERE
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const studentsData = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(studentsData) || studentsData.length === 0) {
      return res
        .status(400)
        .json({ message: "Excel file is empty or invalid" });
    }

    // Rest of your code ...
  } catch (error) {
    console.error("Error creating students:", error);
    res.status(500).json({ message: "Server error while creating students" });
  }
};

// Get All Students
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

// Get Single Student by ID
export const getStudentById = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    const student = await prisma.student.findUnique({
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
  } catch (error) {
    console.error("Error fetching student:", error);
    res.status(500).json({ message: "Server error while fetching student" });
  }
};
export const getStudentByIdOrName = async (req: Request, res: Response) => {
  try {
    const query = req.params.query.trim().replace(/\s+/g, " ");
    const isId = !isNaN(Number(query));

    const students = await prisma.student.findMany({
      where: {
        isdeleted: false,
        ...(isId
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

// Update Student
export const updateStudent = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const {
      firstname,
      middlename,
      lastname,
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
    } = req.body;

    const fullname = `${firstname} ${middlename || ""} ${lastname}`.trim();

    // @ts-ignore
    const user = req.user;

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        firstname,
        middlename,
        lastname,
        fullname,
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

// UPDATE STUDENT CLASS.

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
    await prisma.student.delete({
      where: { id: studentId },
    });
    res.status(200).json({ message: "Student deleted perminatly" });
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

    // Parse the input date or use current date if not provided
    const attendanceDate = date ? new Date(date) : new Date();

    // Convert to UTC date at midnight for comparison
    const attendanceUTCDate = new Date(
      Date.UTC(
        attendanceDate.getUTCFullYear(),
        attendanceDate.getUTCMonth(),
        attendanceDate.getUTCDate()
      )
    );

    // Check if the date is a non-working day (Thursday = 4, Friday = 5)
    const day = attendanceUTCDate.getUTCDay();
    if (day === 4 || day === 5) {
      return res.status(403).json({
        message:
          "Attendance cannot be marked on Thursdays and Fridays (non-working days)",
        errorCode: "NON_WORKING_DAY",
      });
    }

    // Don't allow future dates
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

    // Validate input parameters
    if (typeof present !== "boolean") {
      return res.status(400).json({
        message: "Invalid attendance status format",
      });
    }

    // Validate remark for absent cases
    if (!present && (!remark || remark.trim().length === 0)) {
      return res.status(400).json({
        message: "Remark is required for absent records",
        errorCode: "REMARK_REQUIRED",
      });
    }

    // Verify student existence
    const student = await prisma.student.findUnique({
      where: { id: +studentId },
      select: { id: true },
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found",
        errorCode: "STUDENT_NOT_FOUND",
      });
    }

    // @ts-ignore - Assuming authenticated user
    const user = req.user;

    // Date range for checking existing attendance (whole day in UTC)
    const dateStart = attendanceUTCDate;
    const dateEnd = new Date(
      Date.UTC(
        attendanceUTCDate.getUTCFullYear(),
        attendanceUTCDate.getUTCMonth(),
        attendanceUTCDate.getUTCDate() + 1
      )
    );

    // Check for existing attendance with transaction
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

    // Prevent duplicate attendance
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

    // Additional business logic: Prevent marking absent for students with special status
    if (!present && studentStatus?.remark === "SICK_LEAVE") {
      return res.status(400).json({
        message: "Cannot mark absent for students on sick leave",
        errorCode: "INVALID_STATUS_ACTION",
      });
    }

    // Create attendance record with the specified date
    const newAttendance = await prisma.attendance.create({
      data: {
        studentId: +studentId,
        userId: user.useId,
        present,
        remark: present ? "Present" : remark,
        date: attendanceDate, // Use the provided date or current date/time
      },
    });

    // Post-attendance actions
    if (!present) {
      await prisma.student.update({
        where: { id: +studentId },
        data: { absentCount: { increment: 1 } },
      });
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

export const getTopAbsentStudents = async (req: Request, res: Response) => {
  try {
    // Get top 3 students with highest absent count
    const topAbsentStudents = await prisma.student.findMany({
      select: {
        id: true,
        fullname: true,
        absentCount: true,
        classId: true,
      },
      orderBy: {
        absentCount: "desc",
      },
      take: 5,
    });

    // Get their most recent absence dates
    const studentsWithRecentAbsences = await Promise.all(
      topAbsentStudents.map(async (student) => {
        const recentAbsences = await prisma.attendance.findMany({
          where: {
            studentId: student.id,
            present: false,
          },
          select: {
            date: true,
            remark: true,
          },
          orderBy: {
            date: "desc",
          },
          take: 5, // Get last 3 absence dates
        });

        return {
          ...student,
          recentAbsences: recentAbsences.map((absence) => ({
            date: absence.date.toISOString().split("T")[0], // Format as YYYY-MM-DD
            remark: absence.remark,
            ID: student.id,
          })),
        };
      })
    );

    res.status(200).json({
      success: true,
      data: studentsWithRecentAbsences.map((student) => ({
        id: student.id,
        name: student.fullname,

        totalAbsences: student.absentCount,
        recentAbsences: student.recentAbsences,
      })),
    });
  } catch (error) {
    console.error("Error fetching top absent students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve top absent students",
      error: Error,
    });
  }
};

//update attendence

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

export { upload };

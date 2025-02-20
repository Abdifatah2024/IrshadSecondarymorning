import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";

const prisma = new PrismaClient();

// Create Student
export const createStudent = async (req: Request, res: Response) => {
  try {
    const {
      firstname,
      middlename,
      lastname,
      classId,
      phone,
      gender,
      Age,
      fee,
      Amount,
    } = req.body;
    // @ts-ignore
    const user = req.user;

    const fullname = `${firstname} ${middlename} ${lastname}`;
    // Check if student with the same name already exists
    const checkStudent = await prisma.student.findFirst({
      where: {
        fullname: fullname,
        classId: classId,
      },
    });
    if (checkStudent) {
      return res
        .status(400)
        .json({ message: "Student with the same name already exists" });
    }

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
        Amount,
        userid: user.userid,
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
      Amount,
    } = req.body;

    const fullname = `${firstname} ${middlename} ${lastname}`;

    // @ts-ignore
    const user = req.user;
    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
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
        Amount,
        userid: user.userid,
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

    res.status(200).json({ message: "Student deleted successfully" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Server error while deleting student" });
  }
};
// back student from soft delete
export const backFromSoftDelete = async (req: Request, res: Response) => {
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
      data: { isdeleted: false },
    });

    res.status(200).json({ message: "Student successfully repeat" });
  } catch (error) {
    console.error("Error deleting student:", error);
    res.status(500).json({ message: "Server error while deleting student" });
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
        userid: user.userid,
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
    const { studentId, present, remark } = req.body as attendance;
    // Validate presence and remark
    if (typeof present !== "boolean" || !remark) {
      return res
        .status(400)
        .json({ message: "Both present and remark are required" });
    }
    // Ensure the student exists
    const student = await prisma.student.findUnique({
      where: { id: +studentId },
    });
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    // @ts-ignore
    const user = req.user; // Assuming `req.user` is set from authentication middleware

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if attendance for the student on the same date already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        studentId: +studentId,
        date: today,
      },
    });

    if (existingAttendance) {
      return res
        .status(400)
        .json({ message: "Attendance for this student today already exists" });
    }

    // Create a new attendance record
    const newAttendance = await prisma.attendance.create({
      data: {
        studentId: +studentId,
        userId: user.useId,
        present,
        remark,
      },
    });

    res.status(201).json({
      message: "Attendance marked successfully",
      attendance: newAttendance,
    });
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ message: "Server error while marking attendance" });
  }
};

// get attendence list

export const getAttendance = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);
    const attendance = await prisma.attendance.findMany({
      where: { studentId },
      include: {
        user: {
          select: {
            fullName: true,
          },
        },
      },
    });

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ message: "Server error while fetching attendance" });
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
    const user = req.user; // Assuming `req.user` is set from authentication middleware

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
        userId: user.userId, // Update the user who modified the attendance
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

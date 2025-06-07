import { Request, Response } from "express";
import { PrismaClient, Role } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

// ✅ Register a teacher
export const registerTeacher = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName, phoneNumber, photoUrl } =
      req.body;

    if (!username || !password || !email || !fullName || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const lowerUsername = username.toLowerCase().trim();
    const lowerEmail = email.toLowerCase().trim();
    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    const existingUser = await prisma.user.findFirst({
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

    const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);

    const newTeacher = await prisma.user.create({
      data: {
        username: lowerUsername,
        password: hashedPassword,
        email: lowerEmail,
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        photoUrl: photoUrl?.trim(),
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmpassword: hashedPassword,
        role: Role.Teacher,
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
  } catch (error) {
    console.error("Teacher registration error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred. Please try again later.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

// ✅ Enter exam score (teacher only)
export const TeacherEnterScore = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, academicYearId, scores } = req.body;

    // @ts-ignore
    const userId = req.user?.useId;

    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    if (
      !studentId ||
      !examId ||
      !academicYearId ||
      !Array.isArray(scores) ||
      scores.length === 0
    ) {
      return res.status(400).json({
        message:
          "studentId, examId, academicYearId, and at least one score are required",
      });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student) return res.status(404).json({ message: "Student not found" });

    const classId = student.classId;

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: "Exam not found" });

    const createdScores = [];

    for (const { subjectId, marks } of scores) {
      const isAuthorized = await prisma.teacherClass.findFirst({
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

      const existing = await prisma.score.findFirst({
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

      const score = await prisma.score.create({
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
  } catch (error) {
    console.error("Error entering scores:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Get all teacher assignments (auth required)
// export const getTeacherAssignments = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const user = req.user;

//     if (!user) {
//       return res.status(401).json({ message: "Unauthorized" });
//     }

//     const teacher = await prisma.user.findUnique({
//       where: { id: user.useId },
//       select: { role: true },
//     });

//     if (!teacher || teacher.role !== Role.Teacher) {
//       return res.status(403).json({ message: "Access denied. Not a teacher." });
//     }

//     const assignments = await prisma.teacherClass.findMany({
//       where: { teacherId: user.useId },
//       include: {
//         subject: { select: { id: true, name: true } },
//         class: { select: { id: true, name: true } },
//       },
//     });

//     const result = assignments.map((assignment) => ({
//       classId: assignment.class.id,
//       className: assignment.class.name,
//       subjectId: assignment.subject.id,
//       subjectName: assignment.subject.name,
//     }));

//     return res.status(200).json({
//       teacherId: user.useId,
//       assignments: result,
//     });
//   } catch (error) {
//     console.error("Error fetching teacher assignments:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
// export const getTeacherAssignmentsById = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const teacherId = parseInt(req.params.teacherId);

//     if (!teacherId) {
//       return res.status(400).json({ message: "Teacher ID is required." });
//     }

//     const teacher = await prisma.user.findUnique({
//       where: { id: teacherId },
//       select: { fullName: true, role: true },
//     });

//     if (!teacher || teacher.role !== Role.Teacher) {
//       return res
//         .status(404)
//         .json({ message: "Teacher not found or not a teacher." });
//     }

//     const assignments = await prisma.teacherClass.findMany({
//       where: { teacherId },
//       include: {
//         subject: { select: { id: true, name: true } },
//         class: { select: { id: true, name: true } },
//       },
//     });

//     const result = assignments.map((assignment) => ({
//       classId: assignment.class.id,
//       className: assignment.class.name,
//       subjectId: assignment.subject.id,
//       subjectName: assignment.subject.name,
//     }));

//     return res.status(200).json({
//       teacherId,
//       teacherName: teacher.fullName,
//       assignments: result,
//     });
//   } catch (error) {
//     console.error("Error fetching assignments by teacherId:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };
export const getTeacherAssignmentsById = async (
  req: Request,
  res: Response
) => {
  try {
    const teacherId = parseInt(req.params.teacherId);

    if (!teacherId) {
      return res.status(400).json({ message: "Teacher ID is required." });
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { fullName: true, role: true },
    });

    if (!teacher || teacher.role !== Role.Teacher) {
      return res
        .status(404)
        .json({ message: "Teacher not found or not a teacher." });
    }

    const assignments = await prisma.teacherClass.findMany({
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
  } catch (error) {
    console.error("Error fetching assignments by teacherId:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ✅ Create teacher assignment (class + subject)
export const assignTeacherToClassSubject = async (
  req: Request,
  res: Response
) => {
  try {
    const { teacherId, classId, subjectId } = req.body;

    if (!teacherId || !classId || !subjectId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await prisma.teacherClass.findFirst({
      where: { teacherId, classId, subjectId },
    });

    if (existing) {
      return res
        .status(409)
        .json({ message: "This assignment already exists" });
    }

    const created = await prisma.teacherClass.create({
      data: { teacherId, classId, subjectId },
      include: {
        class: true,
        subject: true,
      },
    });

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { fullName: true },
    });

    return res.status(201).json({
      teacherName: teacher?.fullName,
      classId: created.class.id,
      className: created.class.name,
      subjectId: created.subject.id,
      subjectName: created.subject.name,
    });
  } catch (error) {
    console.error("Error assigning teacher:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// PATCH /exam/teacher/assignments
export const updateTeacherAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId, classId, subjectId } = req.body;

    if (!assignmentId || !classId || !subjectId) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await prisma.teacherClass.findUnique({
      where: { id: assignmentId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const updated = await prisma.teacherClass.update({
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
  } catch (error) {
    console.error("Update assignment error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteTeacherAssignment = async (req: Request, res: Response) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await prisma.teacherClass.findUnique({
      where: { id: Number(assignmentId) },
    });

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found." });
    }

    await prisma.teacherClass.delete({
      where: { id: Number(assignmentId) },
    });

    return res
      .status(200)
      .json({ message: "Assignment deleted successfully", id: assignmentId });
  } catch (error) {
    console.error("Delete error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

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

export const updateStudentScore = async (req: Request, res: Response) => {
  try {
    const { studentId, subjectId, examId, academicYearId, newMarks } = req.body;

    // @ts-ignore
    const userId = req.user?.useId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (
      !studentId ||
      !subjectId ||
      !examId ||
      !academicYearId ||
      newMarks === undefined
    ) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    if (newMarks === 0) {
      return res.status(400).json({ message: "Score cannot be zero." });
    }

    const examMaxMarks: Record<number, number> = {
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
    const user = await prisma.user.findUnique({
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
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { classId: true },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    // ✅ Check if teacher is assigned to this class + subject
    const isAuthorized = await prisma.teacherClass.findFirst({
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
    const score = await prisma.score.findFirst({
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
    const updatedScore = await prisma.score.update({
      where: { id: score.id },
      data: {
        marks: newMarks,
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date(),
      },
    });

    // ✅ Increment correctionsUsed
    await prisma.user.update({
      where: { id: userId },
      data: {
        correctionsUsed: { increment: 1 },
      },
    });

    return res.status(200).json({
      message: "Score updated successfully.",
      updatedScore,
    });
  } catch (error) {
    console.error("Error updating score:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const setCorrectionLimit = async (req: Request, res: Response) => {
  try {
    const { userId, correctionLimit } = req.body;

    // @ts-ignore
    const userRole = req.user?.role;

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

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.role !== "Teacher") {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        correctionLimit,
      },
    });

    return res.status(200).json({
      message: `Correction limit updated to ${correctionLimit} for ${updated.fullName}`,
      updatedUser: updated,
    });
  } catch (error) {
    console.error("Set correction limit error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyCorrectionLimit = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.useId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error("Error fetching correction limit:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getTeacherCorrectionById = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userRole = req.user?.role;
    if (userRole !== "ADMIN") {
      return res.status(403).json({ message: "Only admins are allowed." });
    }

    const userId = Number(req.params.userId);
    if (!userId) {
      return res.status(400).json({ message: "Teacher ID is required." });
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error("Error fetching teacher correction limit:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

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

export const getTeacherDashboardData = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const teacherId = req.user?.useId;
    // ✅ Make sure your middleware sets req.user.useId and req.user.role
    // @ts-ignore
    // const teacherId = req.user?.useId;
    // const role = req.user.role;

    // if (!teacherId || role !== Role.Teacher) {
    //   return res.status(403).json({ message: "Access denied" });
    // }

    // ✅ Get teacher's basic info
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: {
        fullName: true,
        correctionLimit: true,
        correctionsUsed: true,
        role: true,
      },
    });

    if (!teacher || teacher.role !== Role.Teacher) {
      return res.status(404).json({ message: "Teacher not found" });
    }

    // ✅ Get teacher's assignments (class + subject)
    const assignments = await prisma.teacherClass.findMany({
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
  } catch (error) {
    console.error("Error fetching teacher dashboard data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

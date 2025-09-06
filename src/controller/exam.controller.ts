import { Request, Response } from "express";
import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Create Exam Type
export const CreateExamType = async (req: Request, res: Response) => {
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

    const checkExamType = await prisma.exam.findFirst({ where: { name } });
    if (checkExamType) {
      return res.status(400).json({ message: "Exam type already exists" });
    }

    const createExamType = await prisma.exam.create({
      data: { name, type, maxMarks },
    });

    res.status(201).json(createExamType);
  } catch (error) {
    console.error("Error creating exam type:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get All Exam Types
export const GetExamType = async (req: Request, res: Response) => {
  try {
    const examTypes = await prisma.exam.findMany();
    res.json(examTypes);
  } catch (error) {
    console.error("Error fetching exam types:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Create Subject
export const CreateSubjects = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Subject name is required" });
    }

    const existingSubject = await prisma.subject.findFirst({ where: { name } });
    if (existingSubject) {
      return res.status(400).json({ message: "Subject already exists" });
    }

    const createSubject = await prisma.subject.create({ data: { name } });
    res.status(201).json(createSubject);
  } catch (error) {
    console.error("Error creating subject:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
export const RegisterScore = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, subjectId, marks, academicYearId } = req.body;

    if (!studentId || !examId || !subjectId || marks === undefined) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exam = await prisma.exam.findUnique({
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
    const existingScore = await prisma.score.findFirst({
      where: {
        studentId,
        examId,
        subjectId,
        academicYearId: resolvedAcademicYearId,
      },
    });

    if (existingScore) {
      return res.status(400).json({
        message:
          "Score already exists for this exam, subject, and academic year.",
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

    const createScore = await prisma.score.create({
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
  } catch (error) {
    console.error("Error registering score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const registerTenSubjects = async (req: Request, res: Response) => {
  try {
    const {
      studentId,
      examId,
      academicYearId,
      scores,
    }: {
      studentId: number;
      examId: number;
      academicYearId: number;
      scores: { subjectId: number; marks: number }[];
    } = req.body;

    if (
      !studentId ||
      !examId ||
      !academicYearId ||
      !scores ||
      scores.length !== 10
    ) {
      return res.status(400).json({
        message:
          "All fields are required and must register exactly 10 subjects.",
      });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });

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
      const existingScore = await prisma.score.findFirst({
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
    const createdScores = await Promise.all(
      scores.map(({ subjectId, marks }) =>
        prisma.score.create({
          data: {
            studentId,
            examId,
            subjectId,
            marks,
            userid: user.useId,
            academicYearId,
          },
        })
      )
    );

    res.status(201).json({
      message: "All 10 subjects registered successfully.",
      scores: createdScores,
    });
  } catch (error) {
    console.error("Error registering 10 subjects:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const AcademicYear = async (req: Request, res: Response) => {
  try {
    const { year } = req.body;

    if (!year) {
      return res.status(400).json({ message: "Year is required" });
    }

    const existingYear = await prisma.academicYear.findFirst({
      where: { year },
    });
    if (existingYear) {
      return res.status(400).json({ message: "Academic year already exists" });
    }

    const academicYear = await prisma.academicYear.create({ data: { year } });

    res.status(201).json({
      message: "Academic year created successfully",
      academicYear,
    });
  } catch (error) {
    console.error("Error creating academic year:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const listStudentExams = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.studentId);
    const academicYearId = Number(req.params.academicYearId);

    if (!studentId || !academicYearId) {
      return res
        .status(400)
        .json({ message: "Student ID and Academic Year ID are required." });
    }

    // Fetch student
    const student = await prisma.student.findUnique({
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
    const academicYear = await prisma.academicYear.findUnique({
      where: { id: academicYearId },
    });

    if (!academicYear) {
      return res.status(404).json({ message: "Academic Year not found" });
    }

    // Get scores filtered by academic year
    const scores = await prisma.score.findMany({
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
    const examMap: Record<
      number,
      {
        examId: number;
        examName: string;
        subjectScores: { subjectName: string; marks: number }[];
      }
    > = {};

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
        class: student.classes?.name || "No Class",
      },
      academicYear: academicYear.year, // ✅ include year name like "2024-2025"
      exams: Object.values(examMap),
    };

    res.status(200).json(result);
  } catch (error) {
    console.error("Error in listStudentExams:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getExamReportByClass = async (req: Request, res: Response) => {
  try {
    const { classId, examId } = req.body;

    if (!classId || !examId) {
      return res.status(400).json({
        message: "Class ID and Exam ID are required in the request body.",
      });
    }

    // Fetch students in the class
    const students = await prisma.student.findMany({
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

      const totalMarks = student.Score.reduce(
        (acc, score) => acc + score.marks,
        0
      );

      return {
        studentId: student.id,
        fullName: student.fullname,
        totalMarks,
        subjects: subjectScores,
      };
    });

    // Sort by totalMarks and assign ranks
    studentReports.sort((a, b) => b.totalMarks - a.totalMarks);

    const rankedReport = studentReports.map((student, index) => ({
      ...student,
      rank: index + 1,
    }));

    res.status(200).json({
      classId: Number(classId),
      examId: Number(examId),
      report: rankedReport,
    });
  } catch (error) {
    console.error("Error generating exam report by class:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

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
export const getFinalExamReportByClass = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId, academicYearId } = req.body;

    if (!classId || !academicYearId) {
      return res
        .status(400)
        .json({ message: "Class ID and Academic Year ID are required." });
    }

    // Get all students in the class
    const students = await prisma.student.findMany({
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
      const subjectMap: Record<string, number> = {};

      student.Score.forEach((score) => {
        const subjectName = score.subject.name;
        if (["MONTHLY", "MIDTERM", "FINAL"].includes(score.exam.type)) {
          subjectMap[subjectName] =
            (subjectMap[subjectName] || 0) + score.marks;
        }
      });

      const subjectScores = Object.entries(subjectMap).map(
        ([subject, marks]) => ({
          subject,
          marks,
        })
      );

      const totalMarks = subjectScores.reduce(
        (sum, subj) => sum + subj.marks,
        0
      );

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
    let lastTotal: number | null = null;

    let offset = 0;

    const rankedReport = studentReports.map((student, index) => {
      if (student.totalMarks === lastTotal) {
        offset++;
      } else {
        currentRank = index + 1;
        currentRank += offset;
        offset = 0;
        lastTotal = student.totalMarks;
      }

      return { ...student, rank: currentRank };
    });

    res.status(200).json({
      classId: Number(classId),
      academicYearId: Number(academicYearId),
      report: rankedReport,
    });
  } catch (error) {
    console.error("Error fetching final exam report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMidtermMonthlyReportByClass = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ message: "Class ID is required." });
    }

    // Fetch all students with their scores from the given class
    const students = await prisma.student.findMany({
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
      const subjectMap: { [subjectName: string]: number } = {};

      student.Score.forEach((score) => {
        const subjectName = score.subject.name;
        const examType = score.exam.type;

        if (examType === "MONTHLY" || examType === "MIDTERM") {
          subjectMap[subjectName] =
            (subjectMap[subjectName] || 0) + score.marks;
        }
      });

      const subjectScores = Object.entries(subjectMap).map(
        ([subject, marks]) => ({ subject, marks })
      );

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
    let lastScore: number | null = null;
    let sameRankCount = 0;

    const rankedReports = studentReports.map((student, index) => {
      if (student.totalMarks === lastScore) {
        sameRankCount++;
      } else {
        currentRank = index + 1;
        currentRank += sameRankCount;
        sameRankCount = 0;
        lastScore = student.totalMarks;
      }

      return { ...student, rank: currentRank };
    });

    return res.status(200).json({
      classId: Number(classId),
      report: rankedReports,
    });
  } catch (error) {
    console.error("Error generating midterm/monthly report:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
export const getYearlyProgressReportByStudent = async (
  req: Request,
  res: Response
) => {
  try {
    const { studentId, academicYearId } = req.body;

    if (!studentId || !academicYearId) {
      return res
        .status(400)
        .json({ message: "Student ID and Academic Year ID are required." });
    }

    const student = await prisma.student.findUnique({
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

    const subjectMap: Record<string, Record<string, number>> = {};

    for (const score of student.Score) {
      const subject = score.subject.name;
      const type = score.exam.type;

      if (!subjectMap[subject]) {
        subjectMap[subject] = { MONTHLY: 0, MIDTERM: 0, FINAL: 0 };
      }

      subjectMap[subject][type] = score.marks;
    }

    const progressReport = Object.entries(subjectMap).map(
      ([subject, scores]) => {
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
      }
    );

    res.status(200).json({
      student: {
        id: student.id,
        fullName: student.fullname,
        class: student.classes?.name || "No Class",
      },
      academicYearId: Number(academicYearId),
      progressReport,
    });
  } catch (error) {
    console.error("Error generating yearly progress report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//Upgrade student Class after final exam passed.

export const upgradeAllStudents = async (req: Request, res: Response) => {
  const { year } = req.query;

  if (!year) {
    return res
      .status(400)
      .json({ message: "Missing academic year (e.g. ?year=2024-2025)" });
  }

  try {
    // 1. Find the academic year ID
    const academicYear = await prisma.academicYear.findUnique({
      where: { year: year as string },
    });

    if (!academicYear) {
      return res
        .status(404)
        .json({ message: `Academic year "${year}" not found.` });
    }

    // 2. Get total scores for all students in that academic year
    const scores = await prisma.score.groupBy({
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
      const totalMarks = score._sum.marks ?? 0;

      if (totalMarks < 500) continue;

      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: { classes: true },
      });

      if (!student || !student.classes) continue;

      const currentClassName = student.classes.name;
      const match = currentClassName.match(/^(\d+)([A-Za-z]+)$/);

      if (!match) continue;

      const currentNumber = parseInt(match[1]);
      const letter = match[2];
      const nextClassName = `${currentNumber + 1}${letter}`;

      const nextClass = await prisma.classes.findFirst({
        where: { name: nextClassName },
      });

      if (!nextClass) continue;

      const updatedStudent = await prisma.student.update({
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
  } catch (error) {
    console.error("Upgrade error:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const upgradeStudentClass = async (req: Request, res: Response) => {
  const studentId = parseInt(req.params.id);

  try {
    const totalScore = await prisma.score.aggregate({
      _sum: {
        marks: true,
      },
      where: {
        studentId: studentId,
      },
    });

    const total = totalScore._sum.marks ?? 0;

    if (total < 500) {
      return res.status(200).json({
        message: "Student score is less than 500. No upgrade applied.",
      });
    }

    const student = await prisma.student.findUnique({
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

    const nextClass = await prisma.classes.findFirst({
      where: { name: nextClassName },
    });

    if (!nextClass) {
      return res
        .status(404)
        .json({ message: `Next class (${nextClassName}) not found.` });
    }

    const updatedStudent = await prisma.student.update({
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};
// src/controllers/score.controller.ts

export const getTotalScoreByAcademicYear = async (
  req: Request,
  res: Response
) => {
  const studentId = parseInt(req.params.id);
  const academicYear = req.query.year as string;

  if (!academicYear) {
    return res
      .status(400)
      .json({ message: "Missing academic year (e.g., 2024-2025)" });
  }

  try {
    // Find academic year ID
    const year = await prisma.academicYear.findUnique({
      where: { year: academicYear },
    });

    if (!year) {
      return res
        .status(404)
        .json({ message: `Academic year ${academicYear} not found.` });
    }

    // Sum scores for all exam types (monthly + midterm + final)
    const total = await prisma.score.aggregate({
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
      totalMarks: total._sum.marks ?? 0,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error", error });
  }
};

// Update an existing score

export const updateExamScore = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, subjectId, marks, academicYearId } = req.body;

    if (
      !studentId ||
      !examId ||
      !subjectId ||
      marks === undefined ||
      !academicYearId
    ) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return res.status(404).json({ message: "Exam not found" });
    }

    if (marks > exam.maxMarks) {
      return res.status(400).json({
        message: `Marks cannot exceed ${exam.maxMarks} for this exam.`,
      });
    }

    const existingScore = await prisma.score.findFirst({
      where: { studentId, examId, subjectId },
    });

    if (existingScore) {
      const updatedScore = await prisma.score.update({
        where: { id: existingScore.id },
        data: { marks },
      });

      return res.status(200).json({
        message: "Score updated successfully",
        score: updatedScore,
      });
    } else {
      const createdScore = await prisma.score.create({
        data: {
          studentId,
          examId,
          subjectId,
          marks,
          academicYearId,
          // Optional: if using authentication middleware
          //@ts-ignore
          userid: req.user?.useId || 1,
        },
      });

      return res.status(201).json({
        message: "Score created successfully",
        score: createdScore,
      });
    }
  } catch (error) {
    console.error("Error in updateExamScore:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Delete a score record
export const deleteExamScore = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, subjectId } = req.body;

    if (!studentId || !examId || !subjectId) {
      return res
        .status(400)
        .json({ message: "studentId, examId, and subjectId are required" });
    }

    const score = await prisma.score.findFirst({
      where: { studentId, examId, subjectId },
    });

    if (!score) {
      return res.status(404).json({ message: "Score not found" });
    }

    await prisma.score.delete({ where: { id: score.id } });

    res.status(200).json({ message: "Score deleted successfully" });
  } catch (error) {
    console.error("Error deleting score:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

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

export const updateTenSubjects = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, academicYearId, scores } = req.body;

    if (!studentId || !examId || !academicYearId || !Array.isArray(scores)) {
      return res.status(400).json({ message: "Invalid payload" });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });

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

      const existing = await prisma.score.findFirst({
        where: { studentId, examId, subjectId, academicYearId },
      });

      if (existing) {
        const updated = await prisma.score.update({
          where: { id: existing.id },
          data: { marks },
        });
        updatedResults.push(updated);
      } else {
        const created = await prisma.score.create({
          data: {
            studentId,
            examId,
            subjectId,
            marks,
            academicYearId,
            // optional if you have auth
            //@ts-ignore
            userid: req.user?.useId || 1,
          },
        });
        updatedResults.push(created);
      }
    }

    res.status(200).json({
      message: "Scores updated/created successfully",
      scores: updatedResults,
    });
  } catch (error) {
    console.error("Error updating scores:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getStudentExamScores = async (req: Request, res: Response) => {
  try {
    const studentId = parseInt(req.params.studentId);
    const examId = parseInt(req.params.examId);
    const academicYearId = parseInt(req.params.academicYearId);

    if (!studentId || !examId || !academicYearId) {
      return res.status(400).json({
        message: "Student ID, Exam ID, and Academic Year ID are required.",
      });
    }

    const scores = await prisma.score.findMany({
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
  } catch (err) {
    console.error("Error fetching student exam scores:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getParentStudentExamSummary = async (
  req: Request,
  res: Response
) => {
  try {
    // @ts-ignore
    const user = req.user.useId;

    // if (!user || user.Role !== "PARENT") {
    //   return res.status(403).json({
    //     message: "Access denied. Only parents can access this data.",
    //   });
    // }

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
        Score: {
          select: {
            marks: true,
            exam: {
              select: {
                type: true,
              },
            },
            subject: {
              select: {
                name: true,
              },
            },
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
      const subjectSummary: Record<string, any> = {};

      student.Score.forEach((score) => {
        const subjectName = score.subject.name;
        const examType = score.exam?.type;

        if (!subjectSummary[subjectName]) {
          subjectSummary[subjectName] = {
            subject: subjectName,
            monthly: 0,
            midterm: 0,
            final: 0,
            totalMarks: 0,
          };
        }

        if (examType === "MONTHLY") {
          subjectSummary[subjectName].monthly = score.marks;
        } else if (examType === "MIDTERM") {
          subjectSummary[subjectName].midterm = score.marks;
        } else if (examType === "FINAL") {
          subjectSummary[subjectName].final = score.marks;
        }

        subjectSummary[subjectName].totalMarks += score.marks;
      });

      return {
        id: student.id,
        fullname: student.fullname,
        class: student.classes?.name || "N/A",
        exams: Object.values(subjectSummary),
      };
    });

    res.status(200).json({
      success: true,
      message: "Exam summaries fetched successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error fetching parent student exam summary:", error);
    res.status(500).json({
      message: "Server error while fetching exam summaries",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};



type ScoreItem = { subjectId: number; marks: number };
type ExcelRow = { studentId: number; scores: ScoreItem[] }; // exactly 7

export const registerSevenSubjectsBulkFromExcel = async (req: Request, res: Response) => {
  try {
    // Accept JSON or multipart (payload as JSON string)
    const raw = typeof req.body?.payload === "string" ? JSON.parse(req.body.payload) : req.body;

    let { examId, academicYearId, rows, filename } = raw ?? {};
    examId = Number(examId);
    academicYearId = Number(academicYearId);

    if (!Number.isFinite(examId) || !Number.isFinite(academicYearId)) {
      return res.status(400).json({
        message: "examId and academicYearId must be numbers.",
        got: { examId: raw?.examId, academicYearId: raw?.academicYearId },
      });
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        message: "rows[] must be a non-empty array.",
        gotType: typeof rows,
        gotLength: Array.isArray(rows) ? rows.length : undefined,
      });
    }

    // ✅ Enforce auth so userid is always a number (NOT null)
    // @ts-ignore
    const user = req.user as { useId?: number; userId?: number; id?: number } | undefined;
    const authUserId = Number(user?.useId ?? user?.userId ?? user?.id);
    if (!Number.isFinite(authUserId) || authUserId <= 0) {
      return res.status(401).json({ message: "Unauthorized: valid user id is required." });
    }

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return res.status(404).json({ message: "Exam not found." });

    const validateMarks = (marks: number): string | null => {
      if (!Number.isFinite(marks)) return "Marks must be a number.";
      if (marks < 0) return "Marks must be >= 0.";
      if (marks > exam.maxMarks) return `Marks cannot exceed ${exam.maxMarks} for this Exam.`;
      if (exam.type === "MONTHLY" && marks > 20) return "Monthly exam marks must not exceed 20.";
      if (exam.type === "MIDTERM" && marks > 30) return "Midterm exam marks must not exceed 30.";
      if (exam.type === "FINAL" && marks > 50) return "Final exam marks must not exceed 50.";
      return null;
    };

    // Pre-validate rows and collect ids
    const allStudentIds = new Set<number>();
    const allSubjectIds = new Set<number>();
    const preErrors: Array<{ rowIndex: number; reason: string }> = [];

    rows.forEach((row: any, idx: number) => {
      const studentId = Number(row?.studentId);
      if (!Number.isFinite(studentId) || studentId <= 0) {
        preErrors.push({ rowIndex: idx, reason: "Missing or invalid studentId." });
        return;
      }
      if (!Array.isArray(row?.scores) || row.scores.length !== 7) {
        preErrors.push({ rowIndex: idx, reason: "Each row must contain exactly 7 scores." });
        return;
      }
      allStudentIds.add(studentId);
      row.scores.forEach((s: any) => {
        const subjectId = Number(s?.subjectId);
        const marks = Number(s?.marks);
        if (!Number.isFinite(subjectId) || !Number.isFinite(marks)) {
          preErrors.push({ rowIndex: idx, reason: "scores[] must have numeric subjectId and marks." });
          return;
        }
        allSubjectIds.add(subjectId);
      });
    });

    if (preErrors.length === rows.length) {
      return res.status(400).json({ message: "No valid rows to process.", errors: preErrors });
    }

    // Load existing once
    const existing = await prisma.score.findMany({
      where: {
        examId,
        academicYearId,
        studentId: { in: Array.from(allStudentIds) },
        subjectId: { in: Array.from(allSubjectIds) },
      },
      select: { studentId: true, subjectId: true },
    });
    const existingSet = new Set(existing.map((e) => `${e.studentId}-${e.subjectId}`));

    // Build inserts (userid MUST be a number)
    const creates: Prisma.ScoreCreateManyInput[] = [];
    type RowResult = { rowIndex: number; studentId: number; created: number; skipped: number; reasons: string[] };
    const perRowResults: RowResult[] = [];

    rows.forEach((row: any, idx: number) => {
      const studentId = Number(row?.studentId);
      if (!Number.isFinite(studentId) || !Array.isArray(row?.scores) || row.scores.length !== 7) {
        perRowResults.push({
          rowIndex: idx,
          studentId: studentId || 0,
          created: 0,
          skipped: 7,
          reasons: [preErrors.find((e) => e.rowIndex === idx)?.reason || "Invalid row"],
        });
        return;
      }

      let created = 0;
      let skipped = 0;
      const reasons: string[] = [];

      row.scores.forEach((s: any) => {
        const subjectId = Number(s?.subjectId);
        const marks = Number(s?.marks);

        const ruleError = validateMarks(marks);
        if (ruleError) {
          skipped++;
          reasons.push(`subjectId ${subjectId}: ${ruleError}`);
          return;
        }

        const key = `${studentId}-${subjectId}`;
        if (existingSet.has(key)) {
          skipped++;
          reasons.push(`subjectId ${subjectId}: duplicate (already exists)`);
          return;
        }

        creates.push({
          studentId,
          examId,
          subjectId,
          marks,
          userid: authUserId,           // ✅ always a number
          academicYearId,
        });
        existingSet.add(key);
        created++;
      });

      perRowResults.push({ rowIndex: idx, studentId, created, skipped, reasons });
    });

    const [createResult] = await prisma.$transaction([
      prisma.score.createMany({ data: creates, skipDuplicates: false }),
    ]);

    const totalCreated = createResult.count;
    const totalRequested = rows.length * 7;
    const totalSkipped = totalRequested - totalCreated;

    return res.status(201).json({
      message: "Excel exam scores processed (7 subjects).",
      summary: {
        examId,
        academicYearId,
        filename: filename ?? null,
        studentsProcessed: rows.length,
        scoresRequested: totalRequested,
        scoresCreated: totalCreated,
        scoresSkipped: totalSkipped,
      },
      perRowResults,
    });
  } catch (error) {
    console.error("Error bulk-registering exam scores:", error);
    return res.status(500).json({ message: "Internal server error", error: String(error) });
  }
};


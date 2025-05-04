import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

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

    const existingScore = await prisma.score.findFirst({
      where: { studentId, examId, subjectId },
    });

    if (existingScore) {
      return res
        .status(400)
        .json({ message: "Score already exists for this exam and subject." });
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam) {
      return res.status(404).json({ message: "Exam not found." });
    }

    // Validate marks according to Exam type
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

    const resolvedAcademicYearId = academicYearId || exam.academicYearId;

    if (!resolvedAcademicYearId) {
      return res.status(400).json({ message: "Academic Year ID is missing." });
    }

    const createScore = await prisma.score.create({
      data: {
        studentId,
        examId,
        subjectId,
        marks,
        userid: user.useId,
        academicYearId: resolvedAcademicYearId, // ✅ resolved from body or exam
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

    for (const { subjectId } of scores) {
      const existingScore = await prisma.score.findFirst({
        where: {
          studentId,
          examId,
          subjectId,
        },
      });
      if (existingScore) {
        return res.status(400).json({
          message: `Score for subject ID ${subjectId} already exists for this student and exam.`,
        });
      }
    }

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

// Create Academic Year
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
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        fullname: true,
        classes: { select: { name: true } },
      },
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    const exams = await prisma.exam.findMany({
      where: {
        scores: { some: { studentId: Number(id) } },
      },
      select: {
        id: true,
        name: true,
        scores: {
          where: { studentId: Number(id) },
          select: {
            marks: true,
            subject: { select: { name: true } },
          },
        },
      },
    });

    const result = {
      student: {
        id: student.id,
        fullName: student.fullname,
        class: student.classes?.name || "No Class",
      },
      exams: exams.map((exam) => ({
        examId: exam.id,
        examName: exam.name,
        subjectScores: exam.scores.map((s) => ({
          subjectName: s.subject.name,
          marks: s.marks,
        })),
      })),
    };

    res.status(200).json(result);
  } catch (error) {
    console.error(error);
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

export const getFinalExamReportByClass = async (
  req: Request,
  res: Response
) => {
  try {
    const { classId } = req.body;

    if (!classId) {
      return res.status(400).json({ message: "Class ID is required." });
    }

    // Get all students in the class
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

    const studentReports = students.map((student) => {
      // Combine marks from all 3 exam types per subject
      const subjectMap: { [key: string]: number } = {};

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

    // Sort by total marks in descending order
    studentReports.sort((a, b) => b.totalMarks - a.totalMarks);

    // Assign ranks with handling for same marks
    let currentRank = 1;
    let lastTotalMarks: number | null = null;
    let rankOffset = 0;

    const rankedReport = studentReports.map((student, index) => {
      if (student.totalMarks === lastTotalMarks) {
        rankOffset++;
      } else {
        currentRank = index + 1;
        currentRank += rankOffset;
        rankOffset = 0;
        lastTotalMarks = student.totalMarks;
      }

      return {
        ...student,
        rank: currentRank,
      };
    });

    res.status(200).json({
      classId: Number(classId),
      report: rankedReport,
    });
  } catch (error) {
    console.error("Error fetching final exam report:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Get Midterm Result.
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

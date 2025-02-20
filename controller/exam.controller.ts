// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();

// //exam type

// export const CreateExamType = async (req: Request, res: Response) => {
//   try {
//     const { name, type, maxMarks } = req.body;

//     if (!name || !type || !maxMarks) {
//       return res.status(400).json({ message: "All feils are requreired" });
//     }
//     // check beforfe create a new
//     const checkExamType = await prisma.exam.findFirst({
//       where: { name: name },
//     });
//     if (checkExamType) {
//       return res.status(400).json({ message: "Exam type already exists" });
//     }

//     const createexamtype = await prisma.exam.create({
//       data: { name, type, maxMarks },
//     });

//     res.json(createexamtype);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// // get all exam type

// export const GetExamType = async (req: Request, res: Response) => {
//   try {
//     const examtypes = await prisma.exam.findMany();
//     res.json(examtypes);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server Error" });
//   }
// };

// export const CreateSubjects = async (req: Request, res: Response) => {
//   try {
//     const { name } = req.body;
//     const subjects = await prisma.subject.findMany({
//       where: { name },
//     });
//     if (!subjects) {
//       return res.status(400).json({ message: "Subject exists" });
//     }
//     //create a new subject
//     const createSubject = await prisma.subject.create({
//       data: { name },
//     });
//     res.json(createSubject);
//   } catch (error) {}
// };
// export const RegisterScore = async (req: Request, res: Response) => {
//   try {
//     const { studentId, examId, subjectId, marks } = req.body;

//     // Validate required fields
//     if (!studentId || !examId || !subjectId || marks === undefined) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     // Check if the score entry already exists for the student, exam, and subject
//     const existingScore = await prisma.score.findFirst({
//       where: {
//         studentId,
//         examId,
//         subjectId,
//       },
//     });

//     if (existingScore) {
//       return res
//         .status(400)
//         .json({ message: "Score already exists for this exam and subject." });
//     }

//     // check if the score already exists
//     const checkScore = await prisma.score.findFirst({
//       where: {
//         studentId,
//         examId,
//         subjectId,
//       },
//     });
//     if (checkScore) {
//       return res
//         .status(400)
//         .json({ message: "Score already exists for this student and exam." });
//     }

//     //@ts-ignore
//     const user = req.user;

//     // Create a new exam score
//     const createScore = await prisma.score.create({
//       data: {
//         studentId,
//         examId,
//         subjectId,
//         marks,
//         userid: user.useId,
//       },
//     });

//     return res.status(201).json({
//       message: "Score registered successfully",
//       score: createScore,
//     });
//   } catch (error) {
//     console.error("Error registering score:", error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// export const AcademicYear = async (req: Request, res: Response) => {
//   try {
//     const { year } = req.body;

//     // Validate required field
//     if (!year) {
//       return res.status(400).json({ message: "Year is required" });
//     }

//     // Check if the academic year already exists
//     const checkdata = await prisma.academicYear.findUnique({
//       where: { year },
//     });

//     if (checkdata) {
//       return res.status(400).json({ message: "Academic year already exists" });
//     }

//     //check data if existing
//     const existingYear = await prisma.academicYear.findFirst({
//       where: { year },
//     });

//     if (existingYear) {
//       return res.status(400).json({ message: "Academic year already exists" });
//     }

//     // Create a new academic year
//     const academicYear = await prisma.academicYear.createMany({
//       data: { year },
//     });

//     return res.status(201).json({
//       message: "Academic year created successfully",
//       academicYear,
//     });
//   } catch (error) {
//     console.error("Error creating academic year:", error);
//     return res.status(500).json({ message: "Server Error" });
//   }
// };
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

// Register Score
export const RegisterScore = async (req: Request, res: Response) => {
  try {
    const { studentId, examId, subjectId, marks } = req.body;

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

    // Ignore TypeScript error
    //@ts-ignore
    const user = req.user;

    const createScore = await prisma.score.create({
      data: { studentId, examId, subjectId, marks, userid: user.useId },
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

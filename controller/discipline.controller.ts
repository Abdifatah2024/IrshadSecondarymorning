// import { PrismaClient } from "@prisma/client";
// import { Request, Response } from "express";
// const prisma = new PrismaClient();

// // export const createDiscipline = async (req: Request, res: Response) => {
// //   try {
// //     const { studentId, type, description, actionTaken } = req.body;

// //     // @ts-ignore
// //     const user = req.user;

// //     // Validate student existence
// //     const student = await prisma.student.findUnique({
// //       where: { id: +studentId },
// //     });

// //     if (!student) {
// //       return res.status(404).json({ message: "Student not found" });
// //     }

// //     const discipline = await prisma.discipline.create({
// //       data: {
// //         studentId: +studentId,
// //         type,
// //         description,
// //         actionTaken,
// //         recordedBy: user.useId,
// //       },
// //     });

// //     res.status(201).json({
// //       message: "Discipline record created successfully",
// //       discipline,
// //     });
// //   } catch (error) {
// //     console.error("Error creating discipline record:", error);
// //     res.status(500).json({ message: "Server error while creating discipline" });
// //   }
// // };

// export const createDiscipline = async (req: Request, res: Response) => {
//   try {
//     const { studentId, type, description, actionTaken } = req.body;
//     //@ts-ignore
//     const user = req.user; // assuming you get user from auth middleware

//     const discipline = await prisma.discipline.create({
//       data: {
//         studentId: +studentId,
//         type,
//         description,
//         actionTaken,
//         recordedBy: user.useId,
//       },
//       include: {
//         student: {
//           select: {
//             fullname: true,
//             gender: true,
//           },
//         },
//       },
//     });

//     res.status(201).json({
//       message: "Discipline record created successfully",
//       discipline,
//     });
//   } catch (error) {
//     console.error(error);
//     res
//       .status(500)
//       .json({ message: "Server error while creating discipline record" });
//   }
// };

// export const getAllDisciplines = async (req: Request, res: Response) => {
//   try {
//     const disciplines = await prisma.discipline.findMany({
//       where: { isDeleted: false },
//       include: {
//         student: {
//           select: { fullname: true, gender: true },
//         },
//         user: {
//           select: { fullName: true },
//         },
//       },
//       orderBy: {
//         recordedAt: "desc",
//       },
//     });

//     res.status(200).json(disciplines);
//   } catch (error) {
//     console.error("Error fetching disciplines:", error);
//     res
//       .status(500)
//       .json({ message: "Server error while fetching disciplines" });
//   }
// };

// export const getDisciplineById = async (req: Request, res: Response) => {
//   try {
//     const disciplineId = Number(req.params.id);

//     const discipline = await prisma.discipline.findUnique({
//       where: { id: disciplineId, isDeleted: false },
//       include: {
//         student: { select: { fullname: true } },
//         user: { select: { fullName: true } },
//       },
//     });

//     if (!discipline) {
//       return res.status(404).json({ message: "Discipline record not found" });
//     }

//     res.status(200).json(discipline);
//   } catch (error) {
//     console.error("Error fetching discipline record:", error);
//     res.status(500).json({ message: "Server error while fetching discipline" });
//   }
// };

// // Get Discipline by Student ID
// // export const getDisciplineByStudentId = async (req: Request, res: Response) => {
// //   try {
// //     const studentId = Number(req.params.studentId);

// //     if (isNaN(studentId)) {
// //       return res.status(400).json({ message: "Invalid Student ID" });
// //     }

// //     const student = await prisma.student.findUnique({
// //       where: { id: studentId },
// //       include: {
// //         classes: {
// //           select: { name: true },
// //         },
// //         Discipline: {
// //           where: { isDeleted: false },
// //           orderBy: { recordedAt: "desc" },
// //         },
// //       },
// //     });

// //     if (!student) {
// //       return res.status(404).json({ message: "Student not found" });
// //     }

// //     res.status(200).json({
// //       id: student.id,
// //       fullname: student.fullname,
// //       className: student.classes.name,
// //       disciplines: student.Discipline,
// //     });
// //   } catch (error) {
// //     console.error("Error fetching student discipline:", error);
// //     res.status(500).json({ message: "Server error" });
// //   }
// // };
// export const getDisciplineByStudentId = async (req: Request, res: Response) => {
//   try {
//     const studentId = Number(req.params.id);

//     if (isNaN(studentId)) {
//       return res.status(400).json({ message: "Invalid Student ID" });
//     }

//     const student = await prisma.student.findUnique({
//       where: { id: studentId },
//       include: {
//         classes: {
//           select: { name: true },
//         },
//         Discipline: {
//           where: { isDeleted: false },
//           orderBy: { recordedAt: "desc" },
//         },
//       },
//     });

//     if (!student) {
//       return res.status(404).json({ message: "Student not found" });
//     }

//     res.status(200).json({
//       id: student.id,
//       fullname: student.fullname,
//       className: student.classes?.name || "N/A",
//       disciplines: student.Discipline,
//     });
//   } catch (error) {
//     console.error("Error fetching student discipline:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// export const updateDiscipline = async (req: Request, res: Response) => {
//   try {
//     const disciplineId = Number(req.params.id);
//     const { type, description, actionTaken } = req.body;

//     const existingRecord = await prisma.discipline.findUnique({
//       where: { id: disciplineId, isDeleted: false },
//     });

//     if (!existingRecord) {
//       return res.status(404).json({ message: "Discipline record not found" });
//     }

//     const updatedDiscipline = await prisma.discipline.update({
//       where: { id: disciplineId },
//       data: {
//         type,
//         description,
//         actionTaken,
//       },
//     });

//     res.status(200).json({
//       message: "Discipline record updated successfully",
//       discipline: updatedDiscipline,
//     });
//   } catch (error) {
//     console.error("Error updating discipline record:", error);
//     res.status(500).json({ message: "Server error while updating discipline" });
//   }
// };

// export const deleteDiscipline = async (req: Request, res: Response) => {
//   try {
//     const disciplineId = Number(req.params.id);

//     const existingRecord = await prisma.discipline.findUnique({
//       where: { id: disciplineId },
//     });

//     if (!existingRecord) {
//       return res.status(404).json({ message: "Discipline record not found" });
//     }

//     await prisma.discipline.update({
//       where: { id: disciplineId },
//       data: { isDeleted: true },
//     });

//     res
//       .status(200)
//       .json({ message: "Discipline record soft deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting discipline record:", error);
//     res.status(500).json({ message: "Server error while deleting discipline" });
//   }
// };
// export const addDisciplineComment = async (req: Request, res: Response) => {
//   try {
//     const disciplineId = Number(req.params.id);
//     const { content } = req.body;

//     // @ts-ignore
//     const user = req.user;

//     const comment = await prisma.disciplineComment.create({
//       data: {
//         content,
//         disciplineId,
//         userId: user.useId,
//       },
//     });

//     res.status(201).json({ message: "Comment added", comment });
//   } catch (err) {
//     console.error("Error adding comment:", err);
//     res.status(500).json({ message: "Server error while adding comment" });
//   }
// };
// // GET /students/minimal
// export const getMinimalStudentList = async (req: Request, res: Response) => {
//   try {
//     const students = await prisma.student.findMany({
//       where: { isdeleted: false },
//       select: {
//         id: true,
//         fullname: true,
//       },
//       orderBy: {
//         fullname: "asc",
//       },
//     });

//     res.status(200).json(students);
//   } catch (error) {
//     console.error("Error fetching student list:", error);
//     res.status(500).json({ message: "Server error while fetching students" });
//   }
// };
import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

// Create Discipline — only for students where isdeleted = true
export const createDiscipline = async (req: Request, res: Response) => {
  try {
    const { studentId, type, description, actionTaken } = req.body;
    // @ts-ignore
    const user = req.user;

    const student = await prisma.student.findFirst({
      where: {
        id: +studentId,
        isdeleted: true,
      },
    });

    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found or is not marked as deleted" });
    }

    const discipline = await prisma.discipline.create({
      data: {
        studentId: +studentId,
        type,
        description,
        actionTaken,
        recordedBy: user.useId,
      },
      include: {
        student: {
          select: {
            fullname: true,
            gender: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Discipline record created successfully",
      discipline,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error while creating discipline record" });
  }
};

// Get All Disciplines — only for students where isdeleted = true
export const getAllDisciplines = async (req: Request, res: Response) => {
  try {
    const disciplines = await prisma.discipline.findMany({
      where: {
        isDeleted: false,
        student: {
          isdeleted: true,
        },
      },
      include: {
        student: {
          select: { fullname: true, gender: true },
        },
        user: {
          select: { fullName: true },
        },
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    res.status(200).json(disciplines);
  } catch (error) {
    console.error("Error fetching disciplines:", error);
    res
      .status(500)
      .json({ message: "Server error while fetching disciplines" });
  }
};

// Get Discipline by ID — student must be isdeleted = true
export const getDisciplineById = async (req: Request, res: Response) => {
  try {
    const disciplineId = Number(req.params.id);

    const discipline = await prisma.discipline.findFirst({
      where: {
        id: disciplineId,
        isDeleted: false,
        student: {
          isdeleted: true,
        },
      },
      include: {
        student: { select: { fullname: true } },
        user: { select: { fullName: true } },
      },
    });

    if (!discipline) {
      return res.status(404).json({ message: "Discipline record not found" });
    }

    res.status(200).json(discipline);
  } catch (error) {
    console.error("Error fetching discipline record:", error);
    res.status(500).json({ message: "Server error while fetching discipline" });
  }
};

// Get Discipline by Student ID — only if student isdeleted = true
export const getDisciplineByStudentId = async (req: Request, res: Response) => {
  try {
    const studentId = Number(req.params.id);

    if (isNaN(studentId)) {
      return res.status(400).json({ message: "Invalid Student ID" });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        isdeleted: true,
      },
      include: {
        classes: {
          select: { name: true },
        },
        Discipline: {
          where: { isDeleted: false },
          orderBy: { recordedAt: "desc" },
        },
      },
    });

    if (!student) {
      return res
        .status(404)
        .json({ message: "Student not found or not deleted" });
    }

    res.status(200).json({
      id: student.id,
      fullname: student.fullname,
      className: student.classes?.name || "N/A",
      disciplines: student.Discipline,
    });
  } catch (error) {
    console.error("Error fetching student discipline:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Discipline
export const updateDiscipline = async (req: Request, res: Response) => {
  try {
    const disciplineId = Number(req.params.id);
    const { type, description, actionTaken } = req.body;

    const existingRecord = await prisma.discipline.findUnique({
      where: { id: disciplineId, isDeleted: false },
    });

    if (!existingRecord) {
      return res.status(404).json({ message: "Discipline record not found" });
    }

    const updatedDiscipline = await prisma.discipline.update({
      where: { id: disciplineId },
      data: {
        type,
        description,
        actionTaken,
      },
    });

    res.status(200).json({
      message: "Discipline record updated successfully",
      discipline: updatedDiscipline,
    });
  } catch (error) {
    console.error("Error updating discipline record:", error);
    res.status(500).json({ message: "Server error while updating discipline" });
  }
};

// Soft Delete Discipline
export const deleteDiscipline = async (req: Request, res: Response) => {
  try {
    const disciplineId = Number(req.params.id);

    const existingRecord = await prisma.discipline.findUnique({
      where: { id: disciplineId },
    });

    if (!existingRecord) {
      return res.status(404).json({ message: "Discipline record not found" });
    }

    await prisma.discipline.update({
      where: { id: disciplineId },
      data: { isDeleted: true },
    });

    res
      .status(200)
      .json({ message: "Discipline record soft deleted successfully" });
  } catch (error) {
    console.error("Error deleting discipline record:", error);
    res.status(500).json({ message: "Server error while deleting discipline" });
  }
};

// Add Comment to Discipline
export const addDisciplineComment = async (req: Request, res: Response) => {
  try {
    const disciplineId = Number(req.params.id);
    const { content } = req.body;

    // @ts-ignore
    const user = req.user;

    const comment = await prisma.disciplineComment.create({
      data: {
        content,
        disciplineId,
        userId: user.useId,
      },
    });

    res.status(201).json({ message: "Comment added", comment });
  } catch (err) {
    console.error("Error adding comment:", err);
    res.status(500).json({ message: "Server error while adding comment" });
  }
};

// Get Minimal Student List — still returns only students not deleted
export const getMinimalStudentList = async (req: Request, res: Response) => {
  try {
    const students = await prisma.student.findMany({
      where: { isdeleted: false },
      select: {
        id: true,
        fullname: true,
      },
      orderBy: {
        fullname: "asc",
      },
    });

    res.status(200).json(students);
  } catch (error) {
    console.error("Error fetching student list:", error);
    res.status(500).json({ message: "Server error while fetching students" });
  }
};

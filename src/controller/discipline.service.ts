// import { Request, Response } from "express";
// import { PrismaClient } from "@prisma/client";
// const prisma = new PrismaClient();
// import {
//   DisciplineCreateInput,
//   DisciplineActionCreateInput,
//   DisciplineActionUpdateInput,
// } from "../src/types/constant";

// export const createDisciplineRecord = async (data: DisciplineCreateInput) => {
//   return await prisma.discipline.create({
//     data: {
//       studentId: data.studentId,
//       reportedById: data.reportedById,
//       incidentDate: data.incidentDate,
//       category: data.category,
//       severity: data.severity || "MODERATE",
//       description: data.description,
//       evidenceFiles: data.evidenceFiles || [],
//     },
//     include: {
//       student: true,
//       reportedBy: true,
//     },
//   });
// };

// export const addDisciplineAction = async (
//   data: DisciplineActionCreateInput
// ) => {
//   return await prisma.disciplineAction.create({
//     data: {
//       disciplineId: data.disciplineId,
//       actionType: data.actionType,
//       assignedById: data.assignedById,
//       assignedToId: data.assignedToId,
//       startDate: data.startDate,
//       endDate: data.endDate,
//       description: data.description,
//     },
//     include: {
//       assignedBy: true,
//       assignedTo: true,
//       discipline: {
//         include: {
//           student: true,
//         },
//       },
//     },
//   });
// };

// export const updateDisciplineAction = async (
//   id: number,
//   data: DisciplineActionUpdateInput
// ) => {
//   return await prisma.disciplineAction.update({
//     where: { id },
//     data: {
//       status: data.status,
//       outcome: data.outcome,
//       completedDate: data.completedDate,
//     },
//     include: {
//       assignedBy: true,
//       assignedTo: true,
//       discipline: {
//         include: {
//           student: true,
//         },
//       },
//     },
//   });
// };

// export const resolveDisciplineCase = async (
//   id: number,
//   resolutionNotes: string
// ) => {
//   return await prisma.discipline.update({
//     where: { id },
//     data: {
//       isResolved: true,
//       resolutionDate: new Date(),
//       resolutionNotes,
//     },
//     include: {
//       student: true,
//       reportedBy: true,
//       actions: true,
//     },
//   });
// };

// export const getStudentDisciplineHistory = async (studentId: number) => {
//   return await prisma.discipline.findMany({
//     where: { studentId },
//     include: {
//       reportedBy: true,
//       actions: {
//         include: {
//           assignedBy: true,
//           assignedTo: true,
//         },
//       },
//     },
//     orderBy: {
//       incidentDate: "desc",
//     },
//   });
// };

// export const getPendingActionsForUser = async (userId: number) => {
//   return await prisma.disciplineAction.findMany({
//     where: {
//       assignedToId: userId,
//       status: "PENDING",
//     },
//     include: {
//       discipline: {
//         include: {
//           student: true,
//         },
//       },
//       assignedBy: true,
//     },
//   });
// };

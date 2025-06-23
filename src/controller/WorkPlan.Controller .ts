import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();

// Create Work Plan
export const createWorkPlan = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      startDate,
      endDate,
      assignedToId,
      reviewedById,
      reviewComments,
    } = req.body;

    if (!title || !description || !startDate || !endDate || !assignedToId) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    const workPlan = await prisma.workPlan.create({
      data: {
        title,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        assignedToId: Number(assignedToId),
        reviewedById: reviewedById ? Number(reviewedById) : null,
        reviewComments,
      },
    });

    res.status(201).json({ message: "Work plan created", workPlan });
  } catch (error) {
    console.error("Create WorkPlan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get All Work Plans
export const getAllWorkPlans = async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.workPlan.findMany({
      include: {
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ workPlans: plans });
  } catch (error) {
    console.error("Fetch WorkPlans Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Get Single Work Plan by ID
export const getWorkPlanById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    const plan = await prisma.workPlan.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: {
            fullName: true, // ✅ only this field
          },
        },
        reviewedBy: {
          select: {
            fullName: true, // ✅ only this field
          },
        },
      },
    });

    if (!plan) {
      return res.status(404).json({ message: "Work plan not found" });
    }

    res.status(200).json(plan);
  } catch (error) {
    console.error("Get WorkPlan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update Work Plan
export const updateWorkPlan = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const {
      title,
      description,
      startDate,
      endDate,
      status,
      reviewedById,
      reviewComments,
    } = req.body;

    const updated = await prisma.workPlan.update({
      where: { id },
      data: {
        title,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
        reviewedById: reviewedById ? Number(reviewedById) : undefined,
        reviewComments,
      },
    });

    res.status(200).json({ message: "Work plan updated", workPlan: updated });
  } catch (error) {
    console.error("Update WorkPlan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete Work Plan
export const deleteWorkPlan = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    await prisma.workPlan.delete({
      where: { id },
    });

    res.status(200).json({ message: "Work plan deleted" });
  } catch (error) {
    console.error("Delete WorkPlan Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const createWorkPlanComment = async (req: Request, res: Response) => {
  try {
    const { comment, status } = req.body;
    const workPlanId = Number(req.params.workPlanId);

    // @ts-ignore
    const userId = req.user?.useId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const workPlan = await prisma.workPlan.findUnique({
      where: { id: workPlanId },
    });

    if (!workPlan) {
      return res.status(404).json({ message: "Work plan not found" });
    }

    const newComment = await prisma.workPlanComment.create({
      data: {
        comment,
        status,
        workPlanId,
        userId,
      },
    });

    res.status(201).json({
      message: "Comment created",
      comment: newComment,
    });
  } catch (error) {
    console.error("Create comment error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCommentsForWorkPlan = async (req: Request, res: Response) => {
  try {
    const workPlanId = parseInt(req.params.workPlanId);

    const comments = await prisma.workPlanComment.findMany({
      where: { workPlanId },
      include: {
        user: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    res.status(200).json({ comments });
  } catch (error) {
    console.error("Fetch comments error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateWorkPlanComment = async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    const { comment, status } = req.body;
    // @ts-ignore
    const userId = req.user.useId;

    const existing = await prisma.workPlanComment.findUnique({
      where: { id: commentId },
    });

    if (!existing)
      return res.status(404).json({ message: "Comment not found" });
    if (existing.userId !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    const updated = await prisma.workPlanComment.update({
      where: { id: commentId },
      data: { comment, status },
    });

    res.status(200).json({ message: "Comment updated", comment: updated });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteWorkPlanComment = async (req: Request, res: Response) => {
  try {
    const commentId = parseInt(req.params.commentId);
    // @ts-ignore
    const userId = req.user.useId;

    const comment = await prisma.workPlanComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) return res.status(404).json({ message: "Not found" });
    if (comment.userId !== userId)
      return res.status(403).json({ message: "Unauthorized" });

    await prisma.workPlanComment.delete({ where: { id: commentId } });
    res.status(200).json({ message: "Comment deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllWorkPlansWithComments = async (
  _req: Request,
  res: Response
) => {
  try {
    const plans = await prisma.workPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: {
          select: { id: true, fullName: true, role: true },
        },
        reviewedBy: {
          select: { id: true, fullName: true, role: true },
        },
        WorkPlanComment: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: { id: true, fullName: true },
            },
          },
        },
      },
    });

    res.status(200).json({ workPlans: plans });
  } catch (error) {
    console.error("Fetch WorkPlans with Comments Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

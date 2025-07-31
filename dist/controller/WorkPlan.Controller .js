"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllWorkPlansWithComments = exports.deleteWorkPlanComment = exports.updateWorkPlanComment = exports.getCommentsForWorkPlan = exports.createWorkPlanComment = exports.deleteWorkPlan = exports.updateWorkPlan = exports.getWorkPlanById = exports.getAllWorkPlans = exports.createWorkPlan = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// Create Work Plan
const createWorkPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, description, startDate, endDate, assignedToId, reviewedById, reviewComments, } = req.body;
        if (!title || !description || !startDate || !endDate || !assignedToId) {
            return res.status(400).json({ message: "Missing required fields." });
        }
        const workPlan = yield prisma.workPlan.create({
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
    }
    catch (error) {
        console.error("Create WorkPlan Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.createWorkPlan = createWorkPlan;
// Get All Work Plans
const getAllWorkPlans = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma.workPlan.findMany({
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
    }
    catch (error) {
        console.error("Fetch WorkPlans Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getAllWorkPlans = getAllWorkPlans;
// Get Single Work Plan by ID
const getWorkPlanById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const plan = yield prisma.workPlan.findUnique({
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
    }
    catch (error) {
        console.error("Get WorkPlan Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getWorkPlanById = getWorkPlanById;
// Update Work Plan
const updateWorkPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        const { title, description, startDate, endDate, status, reviewedById, reviewComments, } = req.body;
        const updated = yield prisma.workPlan.update({
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
    }
    catch (error) {
        console.error("Update WorkPlan Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updateWorkPlan = updateWorkPlan;
// Delete Work Plan
const deleteWorkPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const id = Number(req.params.id);
        yield prisma.workPlan.delete({
            where: { id },
        });
        res.status(200).json({ message: "Work plan deleted" });
    }
    catch (error) {
        console.error("Delete WorkPlan Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteWorkPlan = deleteWorkPlan;
const createWorkPlanComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { comment, status } = req.body;
        const workPlanId = Number(req.params.workPlanId);
        // @ts-ignore
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.useId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const workPlan = yield prisma.workPlan.findUnique({
            where: { id: workPlanId },
        });
        if (!workPlan) {
            return res.status(404).json({ message: "Work plan not found" });
        }
        const newComment = yield prisma.workPlanComment.create({
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
    }
    catch (error) {
        console.error("Create comment error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.createWorkPlanComment = createWorkPlanComment;
const getCommentsForWorkPlan = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const workPlanId = parseInt(req.params.workPlanId);
        const comments = yield prisma.workPlanComment.findMany({
            where: { workPlanId },
            include: {
                user: { select: { id: true, fullName: true } },
            },
            orderBy: { createdAt: "asc" },
        });
        res.status(200).json({ comments });
    }
    catch (error) {
        console.error("Fetch comments error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getCommentsForWorkPlan = getCommentsForWorkPlan;
const updateWorkPlanComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const commentId = parseInt(req.params.commentId);
        const { comment, status } = req.body;
        // @ts-ignore
        const userId = req.user.useId;
        const existing = yield prisma.workPlanComment.findUnique({
            where: { id: commentId },
        });
        if (!existing)
            return res.status(404).json({ message: "Comment not found" });
        if (existing.userId !== userId)
            return res.status(403).json({ message: "Unauthorized" });
        const updated = yield prisma.workPlanComment.update({
            where: { id: commentId },
            data: { comment, status },
        });
        res.status(200).json({ message: "Comment updated", comment: updated });
    }
    catch (error) {
        console.error("Update error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updateWorkPlanComment = updateWorkPlanComment;
const deleteWorkPlanComment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const commentId = parseInt(req.params.commentId);
        // @ts-ignore
        const userId = req.user.useId;
        const comment = yield prisma.workPlanComment.findUnique({
            where: { id: commentId },
        });
        if (!comment)
            return res.status(404).json({ message: "Not found" });
        if (comment.userId !== userId)
            return res.status(403).json({ message: "Unauthorized" });
        yield prisma.workPlanComment.delete({ where: { id: commentId } });
        res.status(200).json({ message: "Comment deleted" });
    }
    catch (error) {
        console.error("Delete error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteWorkPlanComment = deleteWorkPlanComment;
const getAllWorkPlansWithComments = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const plans = yield prisma.workPlan.findMany({
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
    }
    catch (error) {
        console.error("Fetch WorkPlans with Comments Error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getAllWorkPlansWithComments = getAllWorkPlansWithComments;

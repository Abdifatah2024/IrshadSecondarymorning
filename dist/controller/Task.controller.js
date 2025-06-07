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
exports.deleteTask = exports.updateTask = exports.getUsersWithTasks = exports.getTasks = exports.taskNote = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const taskNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { title, completed, description, due_date } = req.body;
        if (!title || !description) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        //check if the title is
        if (title.length > 10) {
            return res.status(400).json({
                message: "Title should not exceed only five characters",
            });
        }
        const checkTitle = yield prisma.task.findFirst({
            where: {
                title,
            },
        });
        if (checkTitle) {
            return res.status(400).json({
                message: "Title already exists",
            });
        }
        const dueDate = new Date(due_date);
        //@ts-ignore
        const user = req.user;
        const newTask = yield prisma.task.create({
            data: {
                title,
                description,
                completed,
                due_date: dueDate,
                userId: user.useId,
            },
        });
        res.status(201).json({
            message: "Task created successfully",
            task: newTask,
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            Msg: "failed to create task",
        });
    }
});
exports.taskNote = taskNote;
// get all tasks
const getTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const page = Number(req.query.page) || 1;
        const limit = Number(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const tasks = yield prisma.task.findMany({
            skip,
            take: limit,
            orderBy: { due_date: "asc" },
        });
        const totalTasks = yield prisma.task.count();
        res.status(200).json({
            message: "Tasks retrieved successfully",
            tasks,
            totalPages: Math.ceil(totalTasks / limit),
            currentPage: page,
        });
    }
    catch (error) {
        res.status(500).json({ message: "Failed to retrieve tasks" });
    }
});
exports.getTasks = getTasks;
const getUsersWithTasks = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const users = yield prisma.user.findMany({
            include: {
                tasks: {
                    select: {
                        title: true, // Only fetch the task titles
                    },
                },
            },
        });
        res.status(200).json({
            message: "Users and their tasks retrieved successfully",
            users,
        });
    }
    catch (error) {
        console.error("Error fetching users and tasks:", error);
        res.status(500).json({ message: "Failed to retrieve users and tasks" });
    }
});
exports.getUsersWithTasks = getUsersWithTasks;
// update task
const updateTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { title, completed, description, due_date } = req.body;
        if (!title || !description) {
            return res.status(400).json({
                message: "All fields are required",
            });
        }
        //check if the title is
        if (title.length > 10) {
            return res.status(400).json({
                message: "Title should not exceed only  characters",
            });
        }
        const taskId = req.params.id;
        const checkTitle = yield prisma.task.findFirst({
            where: {
                id: +taskId,
            },
        });
        if (!checkTitle) {
            return res.status(404).json({
                message: "Task not found",
            });
        }
        const dueDate = new Date(due_date);
        // @ts-ignore
        const user = req.user;
        yield prisma.task.update({
            where: {
                id: +taskId,
            },
            data: {
                title,
                description,
                completed,
                due_date: dueDate,
            },
        });
        res.status(200).json({
            message: "Task updated successfully",
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            Msg: "failed to update Note",
        });
    }
});
exports.updateTask = updateTask;
// DELETE TASK
const deleteTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskId = req.params.id;
        const checkTask = yield prisma.task.findFirst({
            where: {
                id: +taskId,
            },
        });
        if (!checkTask) {
            return res.status(404).json({
                message: "Task not found",
            });
        }
        //check if the task belongs to the user
        //@ts-ignore
        const user = req.user;
        if (checkTask.userId !== user.useId) {
            return res.status(403).json({
                message: "You don't have permission to delete this task, please try again later or contact the administrator",
            });
        }
        //delete task
        yield prisma.task.delete({
            where: {
                id: +taskId,
            },
        });
        res.status(200).json({
            message: "Task deleted successfully",
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            Msg: "failed to delete Note",
        });
    }
});
exports.deleteTask = deleteTask;

import { PrismaClient } from "@prisma/client";
import { Request, Response } from "express";
import { Icreatetask } from "../types/constant";

const prisma = new PrismaClient();

export const taskNote = async (req: Request, res: Response) => {
  try {
    const { title, completed, description, due_date } = req.body as Icreatetask;
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
    const checkTitle = await prisma.task.findFirst({
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
    const newTask = await prisma.task.create({
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      Msg: "failed to create task",
    });
  }
};

// get all tasks
export const getTasks = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const tasks = await prisma.task.findMany({
      skip,
      take: limit,
      orderBy: { due_date: "asc" },
    });

    const totalTasks = await prisma.task.count();

    res.status(200).json({
      message: "Tasks retrieved successfully",
      tasks,
      totalPages: Math.ceil(totalTasks / limit),
      currentPage: page,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve tasks" });
  }
};
export const getUsersWithTasks = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
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
  } catch (error) {
    console.error("Error fetching users and tasks:", error);
    res.status(500).json({ message: "Failed to retrieve users and tasks" });
  }
};
// update task

export const updateTask = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, completed, description, due_date } = req.body as Icreatetask;
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
    const checkTitle = await prisma.task.findFirst({
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

    await prisma.task.update({
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
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      Msg: "failed to update Note",
    });
  }
};
// DELETE TASK

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    const checkTask = await prisma.task.findFirst({
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
        message:
          "You don't have permission to delete this task, please try again later or contact the administrator",
      });
    }

    //delete task
    await prisma.task.delete({
      where: {
        id: +taskId,
      },
    });
    res.status(200).json({
      message: "Task deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      Msg: "failed to delete Note",
    });
  }
};

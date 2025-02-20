import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const note = async (req: Request, res: Response) => {
  try {
    const { NoteContent } = req.body;
    //@ts-ignore
    const user = req.user;

    console.log(user);
    if (!NoteContent) {
      return res.status(400).json({
        msg: "valid Error",
      });
    }
    const newNote = await prisma.note.create({
      data: {
        NoteContent: NoteContent,
        userId: user.useId,
      },
    });
    console.log(newNote);
    res.status(201).json({
      msg: "Successfully created ",
      result: newNote,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      Msg: "failed to create Note",
    });
  }
};

export const lists = async (req: Request, res: Response) => {
  // console.log("Ok");

  try {
    const list = await prisma.note.findMany({});
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching Note" });
  }
};
// Find Task  Lisk
export const listsTask = async (req: Request, res: Response) => {
  // console.log("Ok");

  try {
    const list = await prisma.task.findMany({});
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching Note" });
  }
};

export const UpdateNote = async (req: Request, res: Response) => {
  // const noteID = req.params;

  try {
    const { NoteContent } = req.body;

    const noteID = req.params.noteID;

    //@ts-ignore
    const userinfo = req.user;
    console.log(userinfo.useId);

    let notes = await prisma.note.findFirst({
      where: {
        id: +noteID,
        userId: userinfo.useId,
      },
    });

    const username = await prisma.user.findFirst({
      where: {
        id: userinfo.useId,
      },
    });

    if (!notes) {
      return res.status(404).json({
        message: `This user doesn't have this note.  user's requstName: ${username?.username}`,
      });
    }

    const updatenotes = await prisma.note.update({
      where: {
        id: +noteID,
        userId: userinfo.useId,
      },
      data: {
        NoteContent,
      },
    });

    res.json({
      Msg: "no one veiw your notes except you",
      updatenotes,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

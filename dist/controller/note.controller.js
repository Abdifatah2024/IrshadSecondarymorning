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
exports.UpdateNote = exports.listsTask = exports.lists = exports.note = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const note = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const newNote = yield prisma.note.create({
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
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            Msg: "failed to create Note",
        });
    }
});
exports.note = note;
const lists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log("Ok");
    try {
        const list = yield prisma.note.findMany({});
        res.json(list);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Note" });
    }
});
exports.lists = lists;
// Find Task  Lisk
const listsTask = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // console.log("Ok");
    try {
        const list = yield prisma.task.findMany({});
        res.json(list);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching Note" });
    }
});
exports.listsTask = listsTask;
const UpdateNote = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // const noteID = req.params;
    try {
        const { NoteContent } = req.body;
        const noteID = req.params.noteID;
        //@ts-ignore
        const userinfo = req.user;
        console.log(userinfo.useId);
        let notes = yield prisma.note.findFirst({
            where: {
                id: +noteID,
                userId: userinfo.useId,
            },
        });
        const username = yield prisma.user.findFirst({
            where: {
                id: userinfo.useId,
            },
        });
        if (!notes) {
            return res.status(404).json({
                message: `This user doesn't have this note.  user's requstName: ${username === null || username === void 0 ? void 0 : username.username}`,
            });
        }
        const updatenotes = yield prisma.note.update({
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
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error fetching users" });
    }
});
exports.UpdateNote = UpdateNote;

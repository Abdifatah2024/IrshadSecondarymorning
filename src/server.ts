import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import userRouter from "../routes/usrroures";
import noteRouter from "../routes/note";
import studentRouter from "../routes/StudentReg";
import examtypeRouter from "../routes/Exam";
import cors from "cors";
dotenv.config();

const app = express();
//midle ware//
app.use(express.json());
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3001"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

const port = process.env.PORT;

app.use("/user", userRouter);
app.use("/Note", noteRouter);
app.use("/student", studentRouter);
app.use("/exam", examtypeRouter);
app.listen(port, () => console.log("app listening on port " + port));

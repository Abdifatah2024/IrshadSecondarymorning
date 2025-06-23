import "dotenv/config"; // Load environment variables FIRST
import express from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import userRouter from "./routes/usrroures";
// import noteRouter from "./routes/note";
import studentRouter from "./routes/StudentReg";
import examtypeRouter from "./routes/Exam";
import Dicipline from "./routes/disciplineroutes";
import FeeRouter from "./routes/studentFeeRoutes";
import AdvanceRouter from "./routes/EmployeeAdvanceRoute";
import expenseRoutes from "./routes/expenseRoutes";
import FinanacialRoutes from "./routes/financialReports";
import cors from "cors";
import path from "path";
import workPlanRoutes from "./routes/workPlanRoutes";

// import morgan from "morgan";
const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://school-backend-system-1.onrender.com",
      "",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  })
);

// Fix 1: Add proper port handling
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000; // Convert to number and add fallback

// Fix 2: Add basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Routes
app.use("/user", userRouter);
// app.use("/Note", noteRouter);
app.use("/student", studentRouter);
app.use("/exam", examtypeRouter);
app.use("/Dicipline", Dicipline);
app.use("/fee", FeeRouter);
app.use("/EmployeeAdvance", AdvanceRouter);
app.use("/expenses", expenseRoutes);
app.use("/financial/Reports", FinanacialRoutes);
app.use("/api/workplans", workPlanRoutes);
app.use(
  "/uploads",
  express.static(path.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
  })
);

// Fix 3: Add error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
  }
);

// In your Express backend (usually in app.js or server.js)
app.use(
  "/uploads",
  express.static("uploads", {
    setHeaders: (res) => {
      res.set("Cross-Origin-Resource-Policy", "cross-origin");
      res.set("Content-Type", "image/jpeg"); // or appropriate type
    },
  })
);
app.use("/uploads", express.static("uploads"));

app.listen(port, () => {
  console.log(`Server running on port ${port}`); // Should now show actual port
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

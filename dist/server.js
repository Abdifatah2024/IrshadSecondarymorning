"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Load environment variables FIRST
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const usrroures_1 = __importDefault(require("./routes/usrroures"));
const note_1 = __importDefault(require("./routes/note"));
const StudentReg_1 = __importDefault(require("./routes/StudentReg"));
const Exam_1 = __importDefault(require("./routes/Exam"));
const disciplineroutes_1 = __importDefault(require("./routes/disciplineroutes"));
const studentFeeRoutes_1 = __importDefault(require("./routes/studentFeeRoutes"));
const EmployeeAdvanceRoute_1 = __importDefault(require("./routes/EmployeeAdvanceRoute"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const financialReports_1 = __importDefault(require("./routes/financialReports"));
const cors_1 = __importDefault(require("cors"));
// import morgan from "morgan";
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "http://localhost:3001", ""],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
}));
// Fix 1: Add proper port handling
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000; // Convert to number and add fallback
// Fix 2: Add basic health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
// Routes
app.use("/user", usrroures_1.default);
app.use("/Note", note_1.default);
app.use("/student", StudentReg_1.default);
app.use("/exam", Exam_1.default);
app.use("/Dicipline", disciplineroutes_1.default);
app.use("/fee", studentFeeRoutes_1.default);
app.use("/EmployeeAdvance", EmployeeAdvanceRoute_1.default);
app.use("/expenses", expenseRoutes_1.default);
app.use("/financial/Reports", financialReports_1.default);
// Fix 3: Add error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});
// In your Express backend (usually in app.js or server.js)
app.use("/uploads", express_1.default.static("uploads", {
    setHeaders: (res) => {
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
        res.set("Content-Type", "image/jpeg"); // or appropriate type
    },
}));
app.use("/uploads", express_1.default.static("uploads"));
app.listen(port, () => {
    console.log(`Server running on port ${port}`); // Should now show actual port
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

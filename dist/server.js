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
// import noteRouter from "./routes/note";
const StudentReg_1 = __importDefault(require("./routes/StudentReg"));
const Exam_1 = __importDefault(require("./routes/Exam"));
const disciplineroutes_1 = __importDefault(require("./routes/disciplineroutes"));
const studentFeeRoutes_1 = __importDefault(require("./routes/studentFeeRoutes"));
const EmployeeAdvanceRoute_1 = __importDefault(require("./routes/EmployeeAdvanceRoute"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const financialReports_1 = __importDefault(require("./routes/financialReports"));
const assetRoutes_1 = __importDefault(require("./routes/assetRoutes"));
const discountLimit_routes_1 = __importDefault(require("./routes/discountLimit.routes"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const workPlanRoutes_1 = __importDefault(require("./routes/workPlanRoutes"));
const sms_route_1 = __importDefault(require("./routes/sms.route"));
const paymentVoucher_routes_1 = __importDefault(require("./routes/paymentVoucher.routes"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const BusRoute_1 = __importDefault(require("./routes/BusRoute"));
const employeeAttendanceRoutes_1 = __importDefault(require("./routes/employeeAttendanceRoutes"));
const ProfitRoute_1 = __importDefault(require("./routes/ProfitRoute"));
const profitLogRoutes_1 = __importDefault(require("./routes/profitLogRoutes"));
// import morgan from "morgan";
const app = (0, express_1.default)();
// Middleware
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
// app.use(
//   cors({
//     origin: [
//       "http://localhost:5173",
//       "https://school-backend-system-1.onrender.com",
//     ],
//     credentials: true,
//     methods: ["GET", "POST", "PUT", "DELETE"],
//   })
// );
// Fix 1: Add proper port handling
app.use((0, cors_1.default)({
    origin: "http://localhost:5173", // ✅ exact origin only
    credentials: true,
}));
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000; // Convert to number and add fallback
// Fix 2: Add basic health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});
// Routes
app.use("/user", usrroures_1.default);
// app.use("/Note", noteRouter);
app.use("/student", StudentReg_1.default);
app.use("/Bus", BusRoute_1.default);
app.use("/exam", Exam_1.default);
app.use("/Dicipline", disciplineroutes_1.default);
app.use("/fee", studentFeeRoutes_1.default);
app.use("/EmployeeAdvance", EmployeeAdvanceRoute_1.default);
app.use("/expenses", expenseRoutes_1.default);
app.use("/financial/Reports", financialReports_1.default);
app.use("/api/workplans", workPlanRoutes_1.default);
app.use("/Api/Sms", sms_route_1.default);
app.use("/Asset", assetRoutes_1.default);
app.use("/Voucher", paymentVoucher_routes_1.default);
app.use("/api/discount-limit", discountLimit_routes_1.default);
app.use("/Employee/Attendece", employeeAttendanceRoutes_1.default);
app.use("/profif/log", ProfitRoute_1.default);
app.use("/Ledger", profitLogRoutes_1.default);
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads"), {
    setHeaders: (res, filePath) => {
        res.set("Cross-Origin-Resource-Policy", "cross-origin");
    },
}));
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

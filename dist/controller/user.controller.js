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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPasswordWithToken = exports.requestPasswordReset = exports.getMyStudents = exports.listParentUsers = exports.deleteEmployee = exports.updateEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.createEmployee = exports.uploadPhoto = exports.uploadUserPhoto = exports.upload = exports.getUserProfile = exports.getUser = exports.whoami = exports.deleteUser = exports.updateUser = exports.users = exports.userinfo = exports.changePassword = exports.login = exports.register = void 0;
// ─────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const multer_1 = __importDefault(require("multer"));
const validator_1 = __importDefault(require("validator"));
const sendResetEmail_1 = require("../controller/sendResetEmail");
// ─────────────────────────────────────────────────────
// Prisma Client
// ─────────────────────────────────────────────────────
const prisma = new client_1.PrismaClient();
const SALT_ROUNDS = 12;
// ─────────────────────────────────────────────────────
// Register User
// ─────────────────────────────────────────────────────
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, password, email, fullName, phoneNumber, photoUrl } = req.body;
        if (!username || !password || !email || !fullName || !phoneNumber) {
            return res.status(400).json({ message: "All fields are required" });
        }
        if (!validator_1.default.isEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }
        if (!validator_1.default.isStrongPassword(password, {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })) {
            return res.status(400).json({
                message: "Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol",
            });
        }
        if (!validator_1.default.isMobilePhone(phoneNumber)) {
            return res.status(400).json({ message: "Invalid phone number" });
        }
        const lowerUsername = username.toLowerCase().trim();
        const lowerEmail = email.toLowerCase().trim();
        const normalizedPhone = phoneNumber.replace(/\D/g, "");
        const existingUser = yield prisma.user.findFirst({
            where: {
                OR: [
                    { username: lowerUsername },
                    { email: lowerEmail },
                    { phoneNumber: normalizedPhone },
                ],
            },
        });
        if (existingUser) {
            if (existingUser.username === lowerUsername)
                return res.status(409).json({ message: "Username already exists" });
            if (existingUser.email === lowerEmail)
                return res.status(409).json({ message: "Email already exists" });
            if (existingUser.phoneNumber === normalizedPhone)
                return res.status(409).json({ message: "Phone number already exists" });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, SALT_ROUNDS);
        const newUser = yield prisma.user.create({
            data: {
                username: lowerUsername,
                password: hashedPassword,
                email: lowerEmail,
                fullName: fullName.trim(),
                phoneNumber: normalizedPhone,
                photoUrl: photoUrl === null || photoUrl === void 0 ? void 0 : photoUrl.trim(),
                emailVerified: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                confirmpassword: hashedPassword,
            },
            select: {
                id: true,
                username: true,
                email: true,
                fullName: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        return res.status(201).json({
            user: newUser,
            message: "Registration successful. Please check your email to verify your account.",
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        return res.status(500).json({
            message: "An unexpected error occurred. Please try again later.",
        });
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.register = register;
// ─────────────────────────────────────────────────────
// Login User
// ─────────────────────────────────────────────────────
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { password, email } = req.body;
        if (!password || !email) {
            return res
                .status(400)
                .json({ message: "Email and password are required." });
        }
        const user = yield prisma.user.findFirst({
            where: { email: email.toLowerCase() },
        });
        if (!user) {
            return res.status(401).json({ message: "Incorrect email or password." });
        }
        // Determine current lock duration
        const unlockAfterMs = user.lockCount === 0 ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1 min or 5 min
        // Auto-unlock if enough time has passed
        if (user.isLocked && user.lockedAt) {
            const now = new Date();
            const lockedForMs = now.getTime() - new Date(user.lockedAt).getTime();
            if (lockedForMs >= unlockAfterMs) {
                yield prisma.user.update({
                    where: { id: user.id },
                    data: {
                        isLocked: false,
                        lockedAt: null,
                        failedAttempts: 0,
                    },
                });
                user.isLocked = false;
                user.failedAttempts = 0;
            }
        }
        // Still locked?
        if (user.isLocked) {
            const remainingTimeMs = unlockAfterMs - (Date.now() - new Date(user.lockedAt).getTime());
            const remainingSeconds = Math.ceil(remainingTimeMs / 1000);
            return res.status(403).json({
                message: `Account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
            });
        }
        const isPasswordValid = bcryptjs_1.default.compareSync(password, user.password);
        if (!isPasswordValid) {
            const updatedAttempts = user.failedAttempts + 1;
            const attemptsLeft = 3 - updatedAttempts;
            if (updatedAttempts >= 3) {
                yield prisma.user.update({
                    where: { id: user.id },
                    data: {
                        failedAttempts: updatedAttempts,
                        isLocked: true,
                        lockedAt: new Date(),
                        lockCount: user.lockCount + 1, // Increase lock count
                    },
                });
                const lockDuration = user.lockCount === 0 ? 1 : 5;
                return res.status(403).json({
                    message: `Account locked after 3 failed attempts. Try again in ${lockDuration} minute${lockDuration === 1 ? "" : "s"}.`,
                });
            }
            yield prisma.user.update({
                where: { id: user.id },
                data: { failedAttempts: updatedAttempts },
            });
            return res.status(401).json({
                message: `Incorrect password. You have ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
            });
        }
        // ✅ Successful login — reset everything
        yield prisma.user.update({
            where: { id: user.id },
            data: {
                failedAttempts: 0,
                isLocked: false,
                lockedAt: null,
                lockCount: 0,
            },
        });
        res.status(200).json({
            message: "Successfully logged in!",
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                fullname: user.fullName,
                Role: user.role,
            },
            Access_token: genarateToken(user),
        });
    }
    catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ message: "Login failed. Please try again." });
    }
});
exports.login = login;
// ─────────────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────────────
const changePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, oldPassword, newPassword } = req.body;
        const user = yield prisma.user.findUnique({ where: { id: +userId } });
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const isPasswordValid = bcryptjs_1.default.compareSync(oldPassword, user.password);
        if (!isPasswordValid)
            return res.status(401).json({ message: "Invalid old password" });
        if (oldPassword === newPassword) {
            return res
                .status(400)
                .json({ message: "New password must be different from old password" });
        }
        const hashedNewPassword = bcryptjs_1.default.hashSync(newPassword);
        const updatedUser = yield prisma.user.update({
            where: { id: +userId },
            data: {
                password: hashedNewPassword,
                confirmpassword: hashedNewPassword,
            },
        });
        const { password, confirmpassword } = updatedUser, safeUser = __rest(updatedUser, ["password", "confirmpassword"]);
        return res.status(200).json({
            user: safeUser,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        console.error("Password change error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.changePassword = changePassword;
// ─────────────────────────────────────────────────────
// Get One User
// ─────────────────────────────────────────────────────
const userinfo = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield prisma.user.findFirst({ where: { id: +userId } });
        if (!user)
            return res.status(404).json({ message: "User not found." });
        const { password, confirmpassword } = user, rest = __rest(user, ["password", "confirmpassword"]);
        res.status(200).json({ message: "Success!", user: rest });
    }
    catch (error) {
        return res.status(500).json({ message: "Something went wrong!" });
    }
});
exports.userinfo = userinfo;
// ─────────────────────────────────────────────────────
// Get All Users
// ─────────────────────────────────────────────────────
const users = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const list = yield prisma.user.findMany();
        res.json(list);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
});
exports.users = users;
// ─────────────────────────────────────────────────────
// Update User
// ─────────────────────────────────────────────────────
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, fullName, email, phoneNumber } = req.body;
        const userid = req.params.id;
        const updateduser = yield prisma.user.findFirst({ where: { id: +userid } });
        if (!updateduser)
            return res.status(400).json({ msg: "user not found" });
        yield prisma.user.update({
            where: { id: +userid },
            data: { username, email, fullName, phoneNumber },
        });
        res.status(200).json({
            message: "Updated user successfully",
            updateUser: { username, email, fullName },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error updating userr" });
    }
});
exports.updateUser = updateUser;
// ─────────────────────────────────────────────────────
// Delete User
// ─────────────────────────────────────────────────────
const deleteUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userid = req.params.id;
        const user = yield prisma.user.findFirst({ where: { id: +userid } });
        if (!user)
            return res.status(400).json({ msg: "user not found" });
        const deletedUser = yield prisma.user.delete({ where: { id: +userid } });
        res.status(201).json({
            msg: "user deleted successfully",
            user: deletedUser,
        });
    }
    catch (error) {
        res.status(500).json({ msg: "some error occurred" });
    }
});
exports.deleteUser = deleteUser;
// ─────────────────────────────────────────────────────
// Token Generator
// ─────────────────────────────────────────────────────
const genarateToken = (user) => {
    const payload = {
        useId: user.id,
        userName: user.username,
        joined_at: user.createdAt,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET_KEY, {
        issuer: "Api.Irshaad.com",
        expiresIn: "1d",
    });
};
// ─────────────────────────────────────────────────────
// Who Am I
// ─────────────────────────────────────────────────────
const whoami = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //@ts-ignore
        const userinfo = req.user;
        res.json({ msg: "success", user: userinfo });
    }
    catch (error) {
        return res.status(500).json({ msg: "Unauthorized3" });
    }
});
exports.whoami = whoami;
// ─────────────────────────────────────────────────────
// Get User by ID
// ─────────────────────────────────────────────────────
const getUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield prisma.user.findFirst({ where: { id: +userId } });
        if (!user)
            return res.status(404).json({ msg: "User not found" });
        res.json({ msg: "success", user });
    }
    catch (error) {
        return res.status(500).json({ msg: "Unauthorized3" });
    }
});
exports.getUser = getUser;
// ─────────────────────────────────────────────────────
// Get User Profile
// ─────────────────────────────────────────────────────
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.userId);
        const user = yield prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                fullName: true,
                username: true,
                email: true,
                photoUrl: true,
                role: true,
            },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        res.status(200).json(user);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch user data" });
    }
});
exports.getUserProfile = getUserProfile;
// ─────────────────────────────────────────────────────
// Upload Config
// ─────────────────────────────────────────────────────
const storage = multer_1.default.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        const uniqueSuffix = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `user-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image"))
        cb(null, true);
    else
        cb(new Error("Only image files are allowed!"), false);
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
});
// ─────────────────────────────────────────────────────
// Upload User Photo (Authenticated User)
// ─────────────────────────────────────────────────────
const uploadUserPhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //@ts-ignore
        const user = req.user;
        const userId = user.useId;
        if (!userId)
            return res.status(401).json({ message: "Authentication required" });
        if (!req.file)
            return res.status(400).json({ message: "No file uploaded" });
        const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: {
                photoUrl,
                photoUpdatedAt: new Date(),
            },
            select: {
                id: true,
                username: true,
                photoUrl: true,
                photoUpdatedAt: true,
            },
        });
        res.status(200).json({ status: "success", data: { user: updatedUser } });
    }
    catch (error) {
        console.error("Photo upload error:", error);
        res
            .status(500)
            .json({ status: "error", message: "Failed to upload photo" });
    }
});
exports.uploadUserPhoto = uploadUserPhoto;
// ─────────────────────────────────────────────────────
// Upload Photo by User ID (Admin or General Endpoint)
// ─────────────────────────────────────────────────────
const uploadPhoto = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = parseInt(req.params.userId);
        const file = req.file;
        if (!file)
            return res.status(400).json({ error: "No file uploaded" });
        const photoUrl = `/uploads/${file.filename}`;
        yield prisma.user.update({
            where: { id: userId },
            data: { photoUrl, photoUpdatedAt: new Date() },
        });
        res.status(200).json({ photoUrl });
    }
    catch (error) {
        res.status(500).json({ error: "Failed to upload photo" });
    }
});
exports.uploadPhoto = uploadPhoto;
// create Employee
const createEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fullName, dateOfBirth, gender, nationalId, phone, email, address, jobTitle, dateOfHire, education, bankAccount, salary, appraisalRecords, disciplinaryActions, } = req.body;
        // @ts-ignore: user is added by auth middleware
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized user" });
        }
        if (!fullName ||
            !dateOfBirth ||
            !gender ||
            !nationalId ||
            !phone ||
            !email ||
            !address ||
            !jobTitle ||
            !dateOfHire ||
            !education ||
            !bankAccount ||
            !salary) {
            return res
                .status(400)
                .json({ message: "All required fields must be filled." });
        }
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedNationalId = nationalId.trim().toUpperCase();
        if (!validator_1.default.isEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Invalid email format" });
        }
        if (isNaN(salary) || Number(salary) <= 0) {
            return res
                .status(400)
                .json({ message: "Salary must be a positive number" });
        }
        const existing = yield prisma.employee.findFirst({
            where: {
                OR: [{ nationalId: normalizedNationalId }, { email: normalizedEmail }],
            },
        });
        if (existing) {
            return res.status(409).json({
                message: "An employee with the same National ID, Email, or Phone already exists",
            });
        }
        const newEmployee = yield prisma.employee.create({
            data: {
                fullName,
                dateOfBirth: new Date(dateOfBirth),
                gender,
                nationalId: normalizedNationalId,
                phone,
                email: normalizedEmail,
                address,
                jobTitle,
                dateOfHire: new Date(dateOfHire),
                education,
                bankAccount,
                salary: parseFloat(salary),
                appraisalRecords,
                disciplinaryActions,
                createdById: user.useId, // ✅ from token
            },
        });
        return res.status(201).json({
            message: "Employee created successfully",
            employee: newEmployee,
        });
    }
    catch (error) {
        console.error("Create employee error:", error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});
exports.createEmployee = createEmployee;
const getAllEmployees = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employees = yield prisma.employee.findMany({
            include: {
                createdBy: {
                    select: { id: true, username: true, email: true },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json({ employees });
    }
    catch (error) {
        console.error("Get all employees error:", error);
        res.status(500).json({ message: "Failed to retrieve employees" });
    }
});
exports.getAllEmployees = getAllEmployees;
// get employee by Id
const getEmployeeById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId))
            return res.status(400).json({ message: "Invalid employee ID" });
        const employee = yield prisma.employee.findUnique({
            where: { id: employeeId },
            include: {
                createdBy: {
                    select: { id: true, username: true },
                },
            },
        });
        if (!employee)
            return res.status(404).json({ message: "Employee not found" });
        res.status(200).json({ employee });
    }
    catch (error) {
        console.error("Get employee by ID error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getEmployeeById = getEmployeeById;
//update employee.
const updateEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId))
            return res.status(400).json({ message: "Invalid employee ID" });
        const { fullName, dateOfBirth, gender, phone, email, address, jobTitle, dateOfHire, education, bankAccount, salary, appraisalRecords, disciplinaryActions, } = req.body;
        const existingEmployee = yield prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!existingEmployee) {
            return res.status(404).json({ message: "Employee not found" });
        }
        const updatedEmployee = yield prisma.employee.update({
            where: { id: employeeId },
            data: {
                fullName,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                gender,
                phone,
                email,
                address,
                jobTitle,
                dateOfHire: dateOfHire ? new Date(dateOfHire) : undefined,
                education,
                bankAccount,
                salary: salary ? parseFloat(salary) : undefined,
                appraisalRecords,
                disciplinaryActions,
            },
        });
        res.status(200).json({
            message: "Employee updated successfully",
            employee: updatedEmployee,
        });
    }
    catch (error) {
        console.error("Update employee error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.updateEmployee = updateEmployee;
// delete employee.
const deleteEmployee = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const employeeId = parseInt(req.params.id);
        if (isNaN(employeeId))
            return res.status(400).json({ message: "Invalid employee ID" });
        const existing = yield prisma.employee.findUnique({
            where: { id: employeeId },
        });
        if (!existing) {
            return res.status(404).json({ message: "Employee not found" });
        }
        yield prisma.employee.delete({ where: { id: employeeId } });
        res.status(200).json({ message: "Employee deleted successfully" });
    }
    catch (error) {
        console.error("Delete employee error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.deleteEmployee = deleteEmployee;
// controllers/userController.ts
const listParentUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parents = yield prisma.user.findMany({
            where: {
                role: "PARENT",
            },
            include: {
                parentStudents: true, // Include associated students
            },
        });
        res.status(200).json({ parents });
    }
    catch (error) {
        console.error("Error fetching parent users:", error);
        res.status(500).json({ message: "Server error fetching parent users" });
    }
});
exports.listParentUsers = listParentUsers;
// GET /api/students/my
// export const getMyStudents = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const user = req.user; // From auth middleware
//     // Check if user is a parent
//     if (user.role !== "PARENT") {
//       return res
//         .status(403)
//         .json({ message: "Access denied: Not a parent account" });
//     }
//     const students = await prisma.student.findMany({
//       where: {
//         parentUserId: user.id, // only their children
//       },
//     });
//     res.status(200).json({ students });
//   } catch (error) {
//     console.error("Error fetching parent's students:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
const getMyStudents = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore — JWT decoded user info
        const user = req.user;
        if (!user || user.role !== "PARENT") {
            return res.status(403).json({ message: "Access denied" });
        }
        const parentId = user.useId; // ✅ important: use `useId`, not `user.id`
        const students = yield prisma.student.findMany({
            where: {
                parentUserId: parentId, // ✅ this filters only students of the logged-in parent
            },
        });
        res.status(200).json({ students });
    }
    catch (error) {
        console.error("Error fetching parent's students:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.getMyStudents = getMyStudents;
//
// controllers/authController.ts
const crypto_1 = __importDefault(require("crypto"));
// export const requestPasswordReset = async (req: Request, res: Response) => {
//   try {
//     const { email } = req.body;
//     const user = await prisma.user.findUnique({
//       where: { email: email.toLowerCase() },
//     });
//     if (!user)
//       return res
//         .status(404)
//         .json({ message: "No user found with that email." });
//     // Limit: 3 times per hour
//     const now = new Date();
//     const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
//     if (user.lastResetRequestAt && user.lastResetRequestAt > oneHourAgo) {
//       if (user.resetRequestCount >= 3) {
//         return res.status(429).json({
//           message: "Too many reset requests. Try again in 1 hour.",
//         });
//       }
//     } else {
//       // Reset count if it's been more than an hour
//       await prisma.user.update({
//         where: { id: user.id },
//         data: {
//           resetRequestCount: 0,
//         },
//       });
//     }
//     const token = crypto.randomBytes(32).toString("hex");
//     const tokenExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min
//     await prisma.user.update({
//       where: { id: user.id },
//       data: {
//         resetToken: token,
//         resetTokenExpires: tokenExpires,
//         resetRequestCount: { increment: 1 },
//         lastResetRequestAt: now,
//       },
//     });
//     return res.status(200).json({
//       message: "Reset token sent.",
//       resetToken: token, // for testing only
//     });
//   } catch (error) {
//     console.error("Reset token error:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };
const requestPasswordReset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield prisma.user.findUnique({
            where: { email: email.toLowerCase() },
        });
        if (!user)
            return res
                .status(404)
                .json({ message: "No user found with that email." });
        // Rate limiting logic (as you already have)
        const token = crypto_1.default.randomBytes(32).toString("hex");
        const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        yield prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpires: tokenExpires,
                resetRequestCount: { increment: 1 },
                lastResetRequestAt: new Date(),
            },
        });
        // ✅ Send the email
        yield (0, sendResetEmail_1.sendResetEmail)(user.email, token);
        res.status(200).json({
            message: "Reset link sent to your email address.",
        });
    }
    catch (error) {
        console.error("Reset token error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.requestPasswordReset = requestPasswordReset;
const resetPasswordWithToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res
                .status(400)
                .json({ message: "Token and new password are required" });
        const user = yield prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpires: { gte: new Date() }, // check token not expired
            },
        });
        if (!user)
            return res.status(400).json({ message: "Invalid or expired token" });
        if (!validator_1.default.isStrongPassword(newPassword, {
            minLength: 6,
            minLowercase: 1,
            minUppercase: 1,
            minNumbers: 1,
            minSymbols: 1,
        })) {
            return res.status(400).json({
                message: "Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol",
            });
        }
        const hashedPassword = yield bcryptjs_1.default.hash(newPassword, 12);
        yield prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpires: null,
            },
        });
        return res.status(200).json({ message: "Password reset successfully" });
    }
    catch (error) {
        console.error("Password reset error:", error);
        res.status(500).json({ message: "Server error" });
    }
});
exports.resetPasswordWithToken = resetPasswordWithToken;

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
exports.refreshAccessToken = exports.deleteAnnouncement = exports.updateAnnouncement = exports.getAllAnnouncementsForAdmin = exports.getAnnouncements = exports.createAnnouncement = exports.updateUserRole = exports.resetPasswordWithToken = exports.requestPasswordReset = exports.getMyStudents = exports.listParentUsers = exports.deleteEmployee = exports.updateEmployee = exports.getEmployeeById = exports.getAllEmployees = exports.createEmployee = exports.deleteUserDocument = exports.uploadPhoto = exports.uploadUserPhoto = exports.getAllDocuments = exports.uploadPdfFile = exports.uploadPdf = exports.uploadImage = exports.getUserProfile = exports.getUser = exports.whoami = exports.generateRefreshToken = exports.deleteUser = exports.updateUser = exports.GetTeachers = exports.users = exports.userinfo = exports.changePassword = exports.login = exports.register = void 0;
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
// export const login = async (req: Request, res: Response) => {
//   try {
//     const { password, email } = req.body;
//     if (!password || !email) {
//       return res
//         .status(400)
//         .json({ message: "Email and password are required." });
//     }
//     const user = await prisma.user.findFirst({
//       where: { email: email.toLowerCase() },
//     });
//     if (!user) {
//       return res.status(401).json({ message: "Incorrect email or password." });
//     }
//     const isPasswordValid = bcryptjs.compareSync(password, user.password);
//     if (!isPasswordValid) {
//       return res.status(401).json({ message: "Incorrect password." });
//     }
//     // ✅ Generate tokens
//     const accessToken = genarateToken(user);
//     const refreshToken = generateRefreshToken(user);
//     // ✅ Set refresh token in cookie
//     res.cookie("refreshToken", refreshToken, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "strict",
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });
//     return res.status(200).json({
//       message: "Successfully logged in!",
//       user: {
//         id: user.id,
//         email: user.email,
//         username: user.username,
//         fullname: user.fullName,
//         Role: user.role,
//       },
//       Access_Token: accessToken,
//     });
//   } catch (error) {
//     console.error("Login error:", error);
//     return res.status(500).json({ message: "Login failed. Please try again." });
//   }
// };
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
const GetTeachers = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const list = yield prisma.user.findMany({
            where: {
                role: "Teacher",
            },
        });
        res.json(list);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: "Error fetching users" });
    }
});
exports.GetTeachers = GetTeachers;
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
const generateRefreshToken = (user) => {
    const payload = {
        userId: user.id,
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET_KEY, {
        issuer: "Api.Irshaad.com",
        expiresIn: "7d", // 7 days
    });
};
exports.generateRefreshToken = generateRefreshToken;
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
// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     const uniqueSuffix = uuidv4();
//     const ext = path.extname(file.originalname);
//     cb(null, `user-${uniqueSuffix}${ext}`);
//   },
// });
// const fileFilter = (req: any, file: any, cb: any) => {
//   if (file.mimetype.startsWith("image")) cb(null, true);
//   else cb(new Error("Only image files are allowed!"), false);
// };
// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter,
// });
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, "uploads/");
    },
    filename: function (_req, file, cb) {
        const uniqueSuffix = (0, uuid_1.v4)();
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
// ─────────────────────────────────────────────────────
// Image File Filter
// ─────────────────────────────────────────────────────
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
        cb(null, true);
    }
    else {
        cb(new Error("Only image files are allowed!"));
    }
};
// ─────────────────────────────────────────────────────
// PDF File Filter
// ─────────────────────────────────────────────────────
const pdfFileFilter = (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
        cb(null, true);
    }
    else {
        cb(new Error("Only PDF files are allowed!"));
    }
};
// ─────────────────────────────────────────────────────
// Multer Uploads
// ─────────────────────────────────────────────────────
exports.uploadImage = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for images
    fileFilter: imageFileFilter,
});
exports.uploadPdf = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for PDFs
    fileFilter: pdfFileFilter,
});
//pdf file
const uploadPdfFile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: "No file uploaded" });
        }
        const title = req.body.title || file.originalname;
        const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
        // If you’re using auth middleware
        // @ts-ignore
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.useId) || 1; // fallback for testing/dev
        const savedDocument = yield prisma.document.create({
            data: {
                title,
                fileName: file.originalname,
                fileUrl,
                uploadedById: userId,
            },
        });
        return res.status(201).json({
            message: "PDF uploaded and saved",
            document: savedDocument,
        });
    }
    catch (error) {
        console.error("PDF upload error:", error);
        return res.status(500).json({ message: "Failed to upload PDF" });
    }
});
exports.uploadPdfFile = uploadPdfFile;
const getAllDocuments = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const docs = yield prisma.document.findMany({
            include: {
                uploadedBy: {
                    select: {
                        id: true,
                        username: true,
                    },
                },
            },
            orderBy: { uploadedAt: "desc" },
        });
        res.status(200).json({ documents: docs });
    }
    catch (error) {
        console.error("List documents error:", error);
        res.status(500).json({ message: "Failed to fetch documents" });
    }
});
exports.getAllDocuments = getAllDocuments;
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
const deleteUserDocument = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore
        const user = req.user;
        const userId = user === null || user === void 0 ? void 0 : user.useId;
        const docId = parseInt(req.params.id);
        if (!userId) {
            return res.status(401).json({ message: "Authentication required" });
        }
        if (isNaN(docId)) {
            return res.status(400).json({ message: "Invalid document ID" });
        }
        // Verify the document belongs to the authenticated user
        const document = yield prisma.document.findUnique({
            where: { id: docId },
        });
        if (!document || document.uploadedById !== userId) {
            return res
                .status(404)
                .json({ message: "Document not found or unauthorized" });
        }
        // Delete from database
        yield prisma.document.delete({ where: { id: docId } });
        res
            .status(200)
            .json({ status: "success", message: "Document deleted successfully" });
    }
    catch (error) {
        console.error("Delete error:", error);
        res
            .status(500)
            .json({ status: "error", message: "Failed to delete document" });
    }
});
exports.deleteUserDocument = deleteUserDocument;
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
// export const updateUserRole = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore — user injected by auth middleware
//     const currentUser = req.user;
//     if (!currentUser || currentUser.role !== "ADMIN") {
//       return res.status(403).json({ message: "Only ADMIN can update roles." });
//     }
//     const userId = parseInt(req.params.id);
//     const { role: newRole } = req.body;
//     if (isNaN(userId)) {
//       return res.status(400).json({ message: "Invalid user ID." });
//     }
//     if (!["ADMIN", "USER"].includes(newRole)) {
//       return res
//         .status(400)
//         .json({ message: "Role can only be changed to ADMIN or USER." });
//     }
//     const targetUser = await prisma.user.findUnique({ where: { id: userId } });
//     if (!targetUser) {
//       return res.status(404).json({ message: "Target user not found." });
//     }
//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: { role: newRole },
//     });
//     return res.status(200).json({
//       message: "User role updated successfully.",
//       user: {
//         id: updatedUser.id,
//         username: updatedUser.username,
//         role: updatedUser.role,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating role:", error);
//     return res.status(500).json({ message: "Server error." });
//   }
// };
// controllers/announcementController.ts
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // @ts-ignore — user injected by auth middleware
        const currentUser = req.user;
        if (!currentUser || !["ADMIN", "ACADEMY"].includes(currentUser.role)) {
            return res
                .status(403)
                .json({ message: "Only ADMIN or ACADEMY can update roles." });
        }
        const userId = parseInt(req.params.id);
        const { role: newRole } = req.body;
        if (isNaN(userId)) {
            return res.status(400).json({ message: "Invalid user ID." });
        }
        const allowedRoles = [
            "ADMIN",
            "USER",
            "Teacher",
            "PARENT",
            "PENDING",
            "ACADEMY",
        ];
        if (!allowedRoles.includes(newRole)) {
            return res.status(400).json({
                message: `Role can only be changed to one of: ${allowedRoles.join(", ")}.`,
            });
        }
        const targetUser = yield prisma.user.findUnique({ where: { id: userId } });
        if (!targetUser) {
            return res.status(404).json({ message: "Target user not found." });
        }
        const updatedUser = yield prisma.user.update({
            where: { id: userId },
            data: { role: newRole },
        });
        return res.status(200).json({
            message: "User role updated successfully.",
            user: {
                id: updatedUser.id,
                username: updatedUser.username,
                role: updatedUser.role,
            },
        });
    }
    catch (error) {
        console.error("Error updating role:", error);
        return res.status(500).json({ message: "Server error." });
    }
});
exports.updateUserRole = updateUserRole;
const createAnnouncement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { title, message, targetRole, startDate, endDate } = req.body;
    //@ts-ignore
    const userId = req.user.useId;
    try {
        const announcement = yield prisma.announcement.create({
            data: {
                title,
                message,
                targetRole,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                createdById: userId,
            },
        });
        res.status(201).json(announcement);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create announcement." });
    }
});
exports.createAnnouncement = createAnnouncement;
const getAnnouncements = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userRole = req.user.role;
    const now = new Date();
    try {
        const announcements = yield prisma.announcement.findMany({
            where: {
                targetRole: userRole,
                startDate: { lte: now },
                endDate: { gte: now },
            },
            orderBy: { createdAt: "desc" },
        });
        // Calculate time left for each announcement
        const enhancedAnnouncements = announcements.map((a) => {
            const timeDiff = new Date(a.endDate).getTime() - now.getTime();
            const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
            const minutesLeft = Math.floor((timeDiff / (1000 * 60)) % 60);
            return Object.assign(Object.assign({}, a), { timeRemaining: `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`, daysLeft,
                hoursLeft,
                minutesLeft });
        });
        res.status(200).json(enhancedAnnouncements);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch announcements." });
    }
});
exports.getAnnouncements = getAnnouncements;
const getAllAnnouncementsForAdmin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //@ts-ignore
    const userRole = req.user.role;
    const now = new Date();
    try {
        const announcements = yield prisma.announcement.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        // Enhance with time remaining info
        const enhancedAnnouncements = announcements.map((a) => {
            const timeDiff = new Date(a.endDate).getTime() - now.getTime();
            const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            const hoursLeft = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
            const minutesLeft = Math.floor((timeDiff / (1000 * 60)) % 60);
            return Object.assign(Object.assign({}, a), { timeRemaining: timeDiff > 0
                    ? `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`
                    : "Expired", daysLeft: timeDiff > 0 ? daysLeft : 0, hoursLeft: timeDiff > 0 ? hoursLeft : 0, minutesLeft: timeDiff > 0 ? minutesLeft : 0, isExpired: timeDiff <= 0 });
        });
        res.status(200).json(enhancedAnnouncements);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch all announcements." });
    }
});
exports.getAllAnnouncementsForAdmin = getAllAnnouncementsForAdmin;
// Update (edit) announcement
const updateAnnouncement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    const { title, message, targetRole, startDate, endDate } = req.body;
    try {
        const updated = yield prisma.announcement.update({
            where: { id },
            data: {
                title,
                message,
                targetRole,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
            },
        });
        res.json(updated);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update announcement." });
    }
});
exports.updateAnnouncement = updateAnnouncement;
// Delete announcement
const deleteAnnouncement = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const id = Number(req.params.id);
    try {
        yield prisma.announcement.delete({ where: { id } });
        res.status(204).end();
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete announcement." });
    }
});
exports.deleteAnnouncement = deleteAnnouncement;
//Generate Token and Referesh Token?
const refreshAccessToken = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing." });
        }
        const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET_KEY);
        const user = yield prisma.user.findUnique({ where: { id: decoded.useId } });
        if (!user) {
            return res.status(403).json({ message: "User not found." });
        }
        const accessPayload = {
            useId: user.id,
            userName: user.username,
            joined_at: user.createdAt,
            role: user.role,
        };
        const newAccessToken = jsonwebtoken_1.default.sign(accessPayload, process.env.JWT_SECRET_KEY, {
            issuer: "Api.Irshaad.com",
            expiresIn: "5m", // or 15m
        });
        return res.status(200).json({
            Access_token: newAccessToken, // ✅ exact format you asked for
        });
    }
    catch (error) {
        console.error("Refresh error:", error);
        return res
            .status(403)
            .json({ message: "Invalid or expired refresh token." });
    }
});
exports.refreshAccessToken = refreshAccessToken;

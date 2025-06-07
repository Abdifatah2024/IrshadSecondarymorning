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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyResetCodeAndChangePassword = exports.sendResetCode = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const notificationService_1 = require("../Utils/notificationService"); // Import at top
const sendResetCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { emailOrPhone } = req.body;
        const user = yield prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrPhone.toLowerCase() },
                    { phoneNumber: emailOrPhone.replace(/\D/g, "") },
                ],
            },
        });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const token = Math.floor(100000 + Math.random() * 900000).toString(); // generate 6-digit code
        const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry
        yield prisma.user.update({
            where: { id: user.id },
            data: { resetToken: token, resetTokenExpires: expires },
        });
        // ✅ Send the verification code
        if (user.email) {
            yield (0, notificationService_1.sendEmail)(user.email, token); // <---- here
        }
        else if (user.phoneNumber) {
            yield (0, notificationService_1.sendWhatsApp)(user.phoneNumber, token); // <---- here
        }
        return res.status(200).json({ message: "Reset code sent" });
    }
    catch (error) {
        console.error("Send reset code error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.sendResetCode = sendResetCode;
const verifyResetCodeAndChangePassword = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res
                .status(400)
                .json({ message: "Token and new password are required" });
        }
        const user = yield prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpires: {
                    gt: new Date(), // Token must not be expired
                },
            },
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid or expired token" });
        }
        const hashedNewPassword = yield bcryptjs_1.default.hash(newPassword, 12);
        yield prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedNewPassword,
                confirmpassword: hashedNewPassword,
                resetToken: null, // Clear the token after use
                resetTokenExpires: null,
            },
        });
        return res.status(200).json({ message: "Password reset successful" });
    }
    catch (error) {
        console.error("Reset password error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
    finally {
        yield prisma.$disconnect();
    }
});
exports.verifyResetCodeAndChangePassword = verifyResetCodeAndChangePassword;

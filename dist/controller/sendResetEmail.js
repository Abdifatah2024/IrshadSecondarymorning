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
exports.sendResetEmail = void 0;
// utils/sendResetEmail.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendResetEmail = (to, token) => __awaiter(void 0, void 0, void 0, function* () {
    const resetLink = `https://yourapp.com/reset-password?token=${token}`;
    const transporter = nodemailer_1.default.createTransport({
        service: "Gmail", // Or "Outlook", "Yahoo", etc.
        auth: {
            user: process.env.SMTP_USER, // Your email
            pass: process.env.SMTP_PASS, // App password or SMTP password
        },
    });
    const mailOptions = {
        from: `"Your App" <${process.env.SMTP_USER}>`,
        to,
        subject: "Reset Your Password",
        html: `
      <p>Hello,</p>
      <p>You requested a password reset.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetLink}" target="_blank">${resetLink}</a>
      <p>This link will expire in 15 minutes.</p>
    `,
    };
    yield transporter.sendMail(mailOptions);
});
exports.sendResetEmail = sendResetEmail;

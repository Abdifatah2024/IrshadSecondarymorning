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
exports.sendEmail = sendEmail;
exports.sendWhatsApp = sendWhatsApp;
const nodemailer_1 = __importDefault(require("nodemailer"));
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config(); // Load .env variables
// ✉️ Send Email
function sendEmail(to, token) {
    return __awaiter(this, void 0, void 0, function* () {
        const transporter = nodemailer_1.default.createTransport({
            service: "Gmail", // or use 'smtp' for other providers
            auth: {
                user: process.env.EMAIL_USER, // Your Gmail address
                pass: process.env.EMAIL_PASS, // Your Gmail app password (not your normal Gmail password)
            },
        });
        yield transporter.sendMail({
            from: `"Your App" <${process.env.EMAIL_USER}>`, // sender
            to: to, // receiver
            subject: "Your Password Reset Code", // Subject line
            text: `Your password reset verification code is: ${token}`, // plain text body
        });
    });
}
// 📱 Send WhatsApp Message
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
function sendWhatsApp(phoneNumber, token) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.messages.create({
            from: "whatsapp:+14155238886", // Twilio Sandbox WhatsApp number
            to: `whatsapp:${phoneNumber}`, // Target user's WhatsApp number
            body: `Your password reset verification code is: ${token}`,
        });
    });
}

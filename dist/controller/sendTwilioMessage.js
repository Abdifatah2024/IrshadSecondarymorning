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
exports.sendParentAbsenceMessage = void 0;
const twilio_1 = __importDefault(require("twilio"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER || "whatsapp:+14155238886";
const client = (0, twilio_1.default)(accountSid, authToken);
const sendParentAbsenceMessage = (to, studentName, remark, date) => __awaiter(void 0, void 0, void 0, function* () {
    const body = `Dear Parent, your child ${studentName} was marked absent on ${date}. Reason: ${remark}`;
    try {
        const response = yield client.messages.create({
            from: twilioPhone,
            to: `whatsapp:${to}`,
            body,
        });
        console.log("✅ Message sent:", response.sid);
    }
    catch (error) {
        console.error("❌ Error sending Twilio message:", error);
    }
});
exports.sendParentAbsenceMessage = sendParentAbsenceMessage;

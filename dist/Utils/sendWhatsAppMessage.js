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
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAbsenceNotification = void 0;
// utils/sendWhatsAppMessage.ts
const twilio_1 = require("twilio");
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = new twilio_1.Twilio(accountSid, authToken);
const sendAbsenceNotification = (toPhone, parentName, studentName, date) => __awaiter(void 0, void 0, void 0, function* () {
    const message = `📢 Dear ${parentName}, your child ${studentName} was marked *Absent* on ${date}. Please follow up with the school if necessary.`;
    return client.messages.create({
        body: message,
        from: "whatsapp:+14155238886", // Twilio WhatsApp sandbox number
        to: `whatsapp:${toPhone}`,
    });
});
exports.sendAbsenceNotification = sendAbsenceNotification;

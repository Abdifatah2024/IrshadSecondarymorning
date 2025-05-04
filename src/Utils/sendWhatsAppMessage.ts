// utils/sendWhatsAppMessage.ts
import { Twilio } from "twilio";

const accountSid = process.env.TWILIO_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const client = new Twilio(accountSid, authToken);

export const sendAbsenceNotification = async (
  toPhone: string,
  parentName: string,
  studentName: string,
  date: string
) => {
  const message = `📢 Dear ${parentName}, your child ${studentName} was marked *Absent* on ${date}. Please follow up with the school if necessary.`;

  return client.messages.create({
    body: message,
    from: "whatsapp:+14155238886", // Twilio WhatsApp sandbox number
    to: `whatsapp:${toPhone}`,
  });
};

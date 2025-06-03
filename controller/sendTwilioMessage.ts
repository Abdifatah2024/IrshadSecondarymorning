import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const twilioPhone = process.env.TWILIO_PHONE_NUMBER! || "whatsapp:+14155238886";

const client = twilio(accountSid, authToken);

export const sendParentAbsenceMessage = async (
  to: string,
  studentName: string,
  remark: string,
  date: string
) => {
  const body = `Dear Parent, your child ${studentName} was marked absent on ${date}. Reason: ${remark}`;
  try {
    const response = await client.messages.create({
      from: twilioPhone,
      to: `whatsapp:${to}`,
      body,
    });
    console.log("✅ Message sent:", response.sid);
  } catch (error) {
    console.error("❌ Error sending Twilio message:", error);
  }
};

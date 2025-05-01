import nodemailer from "nodemailer";
import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config(); // Load .env variables

// ✉️ Send Email
export async function sendEmail(to: string, token: string) {
  const transporter = nodemailer.createTransport({
    service: "Gmail", // or use 'smtp' for other providers
    auth: {
      user: process.env.EMAIL_USER, // Your Gmail address
      pass: process.env.EMAIL_PASS, // Your Gmail app password (not your normal Gmail password)
    },
  });

  await transporter.sendMail({
    from: `"Your App" <${process.env.EMAIL_USER}>`, // sender
    to: to, // receiver
    subject: "Your Password Reset Code", // Subject line
    text: `Your password reset verification code is: ${token}`, // plain text body
  });
}

// 📱 Send WhatsApp Message
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

export async function sendWhatsApp(phoneNumber: string, token: string) {
  await client.messages.create({
    from: "whatsapp:+14155238886", // Twilio Sandbox WhatsApp number
    to: `whatsapp:${phoneNumber}`, // Target user's WhatsApp number
    body: `Your password reset verification code is: ${token}`,
  });
}

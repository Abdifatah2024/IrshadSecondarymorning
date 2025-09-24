import nodemailer from "nodemailer";

// TODO: configure from env
const FROM_EMAIL = process.env.MAIL_FROM || "no-reply@IRSHAAD.com";

export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
}) {
  // Configure your transporter via environment (SMTP, SES, etc.)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 465),
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });

  await transporter.sendMail({
    from: FROM_EMAIL,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export async function sendSms(options: { to: string; text: string }) {
  // Integrate Telesom/Somtel here
  // Example: await telesom.sendSMS(options.to, options.text);
  console.log(`[DEBUG] SMS to ${options.to}: ${options.text}`);
}

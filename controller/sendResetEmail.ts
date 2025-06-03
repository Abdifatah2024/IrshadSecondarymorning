// utils/sendResetEmail.ts
import nodemailer from "nodemailer";

export const sendResetEmail = async (to: string, token: string) => {
  const resetLink = `https://yourapp.com/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
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

  await transporter.sendMail(mailOptions);
};

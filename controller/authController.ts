import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();
import bcrypt from "bcryptjs";
import { sendEmail, sendWhatsApp } from "./../src/Utils/notificationService"; // Import at top

export const sendResetCode = async (req: Request, res: Response) => {
  try {
    const { emailOrPhone } = req.body;

    const user = await prisma.user.findFirst({
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

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    // ✅ Send the verification code
    if (user.email) {
      await sendEmail(user.email, token); // <---- here
    } else if (user.phoneNumber) {
      await sendWhatsApp(user.phoneNumber, token); // <---- here
    }

    return res.status(200).json({ message: "Reset code sent" });
  } catch (error) {
    console.error("Send reset code error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const verifyResetCodeAndChangePassword = async (
  req: Request,
  res: Response
) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ message: "Token and new password are required" });
    }

    const user = await prisma.user.findFirst({
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

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedNewPassword,
        confirmpassword: hashedNewPassword,
        resetToken: null, // Clear the token after use
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "Internal server error" });
  } finally {
    await prisma.$disconnect();
  }
};

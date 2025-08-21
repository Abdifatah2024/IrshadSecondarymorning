// ─────────────────────────────────────────────────────
// Imports
// ─────────────────────────────────────────────────────
import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { isFloat64Array } from "util/types";
import { channel } from "diagnostics_channel";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import multer from "multer";
import * as XLSX from "xlsx";
import fs from "fs";
import validator from "validator";

import { sendResetEmail } from "../controller/sendResetEmail";
// ─────────────────────────────────────────────────────
// Prisma Client
// ─────────────────────────────────────────────────────
const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

// ─────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────
interface ICreateUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  photoUrl: string;
}

// ─────────────────────────────────────────────────────
// Register User
// ─────────────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName, phoneNumber, photoUrl } =
      req.body as ICreateUser;

    if (!username || !password || !email || !fullName || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (
      !validator.isStrongPassword(password, {
        minLength: 6,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol",
      });
    }

    if (!validator.isMobilePhone(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    const lowerUsername = username.toLowerCase().trim();
    const lowerEmail = email.toLowerCase().trim();
    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: lowerUsername },
          { email: lowerEmail },
          { phoneNumber: normalizedPhone },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.username === lowerUsername)
        return res.status(409).json({ message: "Username already exists" });
      if (existingUser.email === lowerEmail)
        return res.status(409).json({ message: "Email already exists" });
      if (existingUser.phoneNumber === normalizedPhone)
        return res.status(409).json({ message: "Phone number already exists" });
    }

    const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);

    const newUser = await prisma.user.create({
      data: {
        username: lowerUsername,
        password: hashedPassword,
        email: lowerEmail,
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        photoUrl: photoUrl?.trim(),
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmpassword: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(201).json({
      user: newUser,
      message:
        "Registration successful. Please check your email to verify your account.",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "An unexpected error occurred. Please try again later.",
    });
  } finally {
    await prisma.$disconnect();
  }
};

// ─────────────────────────────────────────────────────
// Login User
// ─────────────────────────────────────────────────────

export const login = async (req: Request, res: Response) => {
  try {
    const { password, email } = req.body;

    if (!password || !email) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }

    // Determine current lock duration
    const unlockAfterMs = user.lockCount === 0 ? 1 * 60 * 1000 : 5 * 60 * 1000; // 1 min or 5 min

    // Auto-unlock if enough time has passed
    if (user.isLocked && user.lockedAt) {
      const now = new Date();
      const lockedForMs = now.getTime() - new Date(user.lockedAt).getTime();

      if (lockedForMs >= unlockAfterMs) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            isLocked: false,
            lockedAt: null,
            failedAttempts: 0,
          },
        });
        user.isLocked = false;
        user.failedAttempts = 0;
      }
    }

    // Still locked?
    if (user.isLocked) {
      const remainingTimeMs =
        unlockAfterMs - (Date.now() - new Date(user.lockedAt!).getTime());
      const remainingSeconds = Math.ceil(remainingTimeMs / 1000);
      return res.status(403).json({
        message: `Account is temporarily locked. Try again in ${remainingSeconds} seconds.`,
      });
    }

    const isPasswordValid = bcryptjs.compareSync(password, user.password);

    if (!isPasswordValid) {
      const updatedAttempts = user.failedAttempts + 1;
      const attemptsLeft = 3 - updatedAttempts;

      if (updatedAttempts >= 3) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedAttempts: updatedAttempts,
            isLocked: true,
            lockedAt: new Date(),
            lockCount: user.lockCount + 1, // Increase lock count
          },
        });

        const lockDuration = user.lockCount === 0 ? 1 : 5;
        return res.status(403).json({
          message: `Account locked after 3 failed attempts. Try again in ${lockDuration} minute${
            lockDuration === 1 ? "" : "s"
          }.`,
        });
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { failedAttempts: updatedAttempts },
      });

      return res.status(401).json({
        message: `Incorrect password. You have ${attemptsLeft} attempt${
          attemptsLeft === 1 ? "" : "s"
        } left.`,
      });
    }

    // ✅ Successful login — reset everything
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: 0,
        isLocked: false,
        lockedAt: null,
        lockCount: 0,
      },
    });

    res.status(200).json({
      message: "Successfully logged in!",
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullname: user.fullName,
        Role: user.role,
      },
      Access_token: genarateToken(user),
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Login failed. Please try again." });
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: +userId } });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isPasswordValid = bcryptjs.compareSync(oldPassword, user.password);
    if (!isPasswordValid)
      return res.status(401).json({ message: "Invalid old password" });

    if (oldPassword === newPassword) {
      return res
        .status(400)
        .json({ message: "New password must be different from old password" });
    }

    const hashedNewPassword = bcryptjs.hashSync(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: +userId },
      data: {
        password: hashedNewPassword,
        confirmpassword: hashedNewPassword,
      },
    });

    const { password, confirmpassword, ...safeUser } = updatedUser;

    return res.status(200).json({
      user: safeUser,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ─────────────────────────────────────────────────────
// Get One User
// ─────────────────────────────────────────────────────
export const userinfo = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findFirst({ where: { id: +userId } });

    if (!user) return res.status(404).json({ message: "User not found." });

    const { password, confirmpassword, ...rest } = user;
    res.status(200).json({ message: "Success!", user: rest });
  } catch (error) {
    return res.status(500).json({ message: "Something went wrong!" });
  }
};

// ─────────────────────────────────────────────────────
// Get All Users
// ─────────────────────────────────────────────────────
export const users = async (_req: Request, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      where: {
        role: {
          not: "PARENT", // ✅ Exclude users with role PARENT
        },
      },
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

export const GetTeachers = async (_req: Request, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      where: {
        role: "Teacher",
      },
    });
    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

// ─────────────────────────────────────────────────────
// Update User
// ─────────────────────────────────────────────────────
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { username, fullName, email, phoneNumber } = req.body as ICreateUser;
    const userid = req.params.id;

    const updateduser = await prisma.user.findFirst({ where: { id: +userid } });
    if (!updateduser) return res.status(400).json({ msg: "user not found" });

    await prisma.user.update({
      where: { id: +userid },
      data: { username, email, fullName, phoneNumber },
    });

    res.status(200).json({
      message: "Updated user successfully",
      updateUser: { username, email, fullName },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating userr" });
  }
};

// ─────────────────────────────────────────────────────
// Delete User
// ─────────────────────────────────────────────────────
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userid = req.params.id;
    const user = await prisma.user.findFirst({ where: { id: +userid } });

    if (!user) return res.status(400).json({ msg: "user not found" });

    const deletedUser = await prisma.user.delete({ where: { id: +userid } });

    res.status(201).json({
      msg: "user deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    res.status(500).json({ msg: "some error occurred" });
  }
};

// ─────────────────────────────────────────────────────
// Token Generator
// ─────────────────────────────────────────────────────
const genarateToken = (user: User): string => {
  const payload = {
    useId: user.id,
    userName: user.username,
    joined_at: user.createdAt,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    issuer: "Api.Irshaad.com",
    expiresIn: "1h",
  });
};

export const generateRefreshToken = (user: User): string => {
  const payload = {
    userId: user.id,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET_KEY as string, {
    issuer: "Api.Irshaad.com",
    expiresIn: "1h",
  });
};

// ─────────────────────────────────────────────────────
// Who Am I
// ─────────────────────────────────────────────────────
export const whoami = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userinfo = req.user;
    res.json({ msg: "success", user: userinfo });
  } catch (error) {
    return res.status(500).json({ msg: "Unauthorized3" });
  }
};

// ─────────────────────────────────────────────────────
// Get User by ID
// ─────────────────────────────────────────────────────
export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findFirst({ where: { id: +userId } });

    if (!user) return res.status(404).json({ msg: "User not found" });

    res.json({ msg: "success", user });
  } catch (error) {
    return res.status(500).json({ msg: "Unauthorized3" });
  }
};

// ─────────────────────────────────────────────────────
// Get User Profile
// ─────────────────────────────────────────────────────
export const getUserProfile = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        photoUrl: true,
        role: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

// ─────────────────────────────────────────────────────
// Upload Config
// ─────────────────────────────────────────────────────
// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     const uniqueSuffix = uuidv4();
//     const ext = path.extname(file.originalname);
//     cb(null, `user-${uniqueSuffix}${ext}`);
//   },
// });

// const fileFilter = (req: any, file: any, cb: any) => {
//   if (file.mimetype.startsWith("image")) cb(null, true);
//   else cb(new Error("Only image files are allowed!"), false);
// };

// export const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 },
//   fileFilter,
// });
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, "uploads/");
  },
  filename: function (_req, file, cb) {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// ─────────────────────────────────────────────────────
// Image File Filter
// ─────────────────────────────────────────────────────
const imageFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"));
  }
};

// ─────────────────────────────────────────────────────
// PDF File Filter
// ─────────────────────────────────────────────────────
const pdfFileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed!"));
  }
};

// ─────────────────────────────────────────────────────
// Multer Uploads
// ─────────────────────────────────────────────────────
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for images
  fileFilter: imageFileFilter,
});

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for PDFs
  fileFilter: pdfFileFilter,
});

//pdf file
export const uploadPdfFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const title = req.body.title || file.originalname;
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${
      file.filename
    }`;

    // If you’re using auth middleware
    // @ts-ignore
    const userId = req.user?.useId || 1; // fallback for testing/dev

    const savedDocument = await prisma.document.create({
      data: {
        title,
        fileName: file.originalname,
        fileUrl,
        uploadedById: userId,
      },
    });

    return res.status(201).json({
      message: "PDF uploaded and saved",
      document: savedDocument,
    });
  } catch (error) {
    console.error("PDF upload error:", error);
    return res.status(500).json({ message: "Failed to upload PDF" });
  }
};

export const getAllDocuments = async (_req: Request, res: Response) => {
  try {
    const docs = await prisma.document.findMany({
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { uploadedAt: "desc" },
    });

    res.status(200).json({ documents: docs });
  } catch (error) {
    console.error("List documents error:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
};

// ─────────────────────────────────────────────────────
// Upload User Photo (Authenticated User)
// ─────────────────────────────────────────────────────
export const uploadUserPhoto = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const user = req.user;
    const userId = user.useId;

    if (!userId)
      return res.status(401).json({ message: "Authentication required" });
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        photoUrl,
        photoUpdatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        photoUrl: true,
        photoUpdatedAt: true,
      },
    });

    res.status(200).json({ status: "success", data: { user: updatedUser } });
  } catch (error) {
    console.error("Photo upload error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to upload photo" });
  }
};

// ─────────────────────────────────────────────────────
// Upload Photo by User ID (Admin or General Endpoint)
// ─────────────────────────────────────────────────────
export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const file = req.file;

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const photoUrl = `/uploads/${file.filename}`;

    await prisma.user.update({
      where: { id: userId },
      data: { photoUrl, photoUpdatedAt: new Date() },
    });

    res.status(200).json({ photoUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to upload photo" });
  }
};
export const deleteUserDocument = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const user = req.user;
    const userId = user?.useId;
    const docId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (isNaN(docId)) {
      return res.status(400).json({ message: "Invalid document ID" });
    }

    // Verify the document belongs to the authenticated user
    const document = await prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document || document.uploadedById !== userId) {
      return res
        .status(404)
        .json({ message: "Document not found or unauthorized" });
    }

    // Delete from database
    await prisma.document.delete({ where: { id: docId } });

    res
      .status(200)
      .json({ status: "success", message: "Document deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res
      .status(500)
      .json({ status: "error", message: "Failed to delete document" });
  }
};

// create Employee
export const createEmployee = async (req: Request, res: Response) => {
  try {
    const {
      fullName,
      dateOfBirth,
      gender,
      nationalId,
      phone,
      email,
      address,
      jobTitle,
      dateOfHire,
      education,
      bankAccount,
      salary,
      appraisalRecords,
      disciplinaryActions,
    } = req.body;

    // @ts-ignore: user is added by auth middleware
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (
      !fullName ||
      !dateOfBirth ||
      !gender ||
      !nationalId ||
      !phone ||
      !email ||
      !address ||
      !jobTitle ||
      !dateOfHire ||
      !education ||
      !bankAccount ||
      !salary
    ) {
      return res
        .status(400)
        .json({ message: "All required fields must be filled." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedNationalId = nationalId.trim().toUpperCase();

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    if (isNaN(salary) || Number(salary) <= 0) {
      return res
        .status(400)
        .json({ message: "Salary must be a positive number" });
    }

    const existing = await prisma.employee.findFirst({
      where: {
        OR: [{ nationalId: normalizedNationalId }, { email: normalizedEmail }],
      },
    });

    if (existing) {
      return res.status(409).json({
        message:
          "An employee with the same National ID, Email, or Phone already exists",
      });
    }

    const newEmployee = await prisma.employee.create({
      data: {
        fullName,
        dateOfBirth: new Date(dateOfBirth),
        gender,
        nationalId: normalizedNationalId,
        phone,
        email: normalizedEmail,
        address,
        jobTitle,
        dateOfHire: new Date(dateOfHire),
        education,
        bankAccount,
        salary: parseFloat(salary),
        appraisalRecords,
        disciplinaryActions,
        createdById: user.useId, // ✅ from token
      },
    });

    return res.status(201).json({
      message: "Employee created successfully",
      employee: newEmployee,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const createMultipleEmployeesByExcel = async (
  req: Request,
  res: Response
) => {
  try {
    // @ts-ignore
    const user = req.user;

    if (!user) {
      return res.status(401).json({ message: "Unauthorized user" });
    }

    if (!req.file || !req.file.path) {
      return res.status(400).json({ message: "No Excel file uploaded." });
    }

    const filePath = path.resolve(req.file.path);
    const workbook = XLSX.readFile(filePath);

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      return res
        .status(400)
        .json({ message: "Uploaded Excel file has no sheets" });
    }

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const employeeData = XLSX.utils.sheet_to_json(worksheet);

    // Optional: Log header keys
    if (employeeData.length > 0) {
      const firstRow = employeeData[0] as Record<string, any>;
      console.log("Excel Header Keys:", Object.keys(firstRow));
    }

    const createdEmployees = [];
    const skippedEmployees: { row: number; reason: string }[] = [];

    for (let i = 0; i < employeeData.length; i++) {
      const row = employeeData[i] as any;

      const fullName = row["Full Name"];
      const email = row["Email"];
      const phone = row["Phone"];
      const gender = row["Gender"];
      const nationalId = row["National ID"]; // optional
      const address = row["Address"];
      const jobTitle = row["Job Title"];
      const education = row["Education"];
      const bankAccount = row["Bank Account"];
      const salary = row["Salary"];
      const dateOfHire = row["Date of Hire"] || new Date(); // default to today if missing
      const dateOfBirth = row["Date of Birth"] || "2000-01-01"; // optional

      // Required fields check
      if (
        !fullName ||
        !email ||
        !phone ||
        !gender ||
        !address ||
        !jobTitle ||
        !education ||
        !bankAccount ||
        !salary
      ) {
        skippedEmployees.push({
          row: i + 2,
          reason: "Missing required fields",
        });
        continue;
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const normalizedNationalId = nationalId
        ? String(nationalId).trim().toUpperCase()
        : "NID" + phone;
      const formattedPhone = String(phone).trim();

      if (!validator.isEmail(normalizedEmail)) {
        skippedEmployees.push({ row: i + 2, reason: "Invalid email format" });
        continue;
      }

      if (isNaN(salary) || Number(salary) <= 0) {
        skippedEmployees.push({ row: i + 2, reason: "Invalid salary" });
        continue;
      }

      const existing = await prisma.employee.findFirst({
        where: {
          OR: [
            { nationalId: normalizedNationalId },
            { email: normalizedEmail },
            { phone: formattedPhone },
          ],
        },
      });

      if (existing) {
        skippedEmployees.push({ row: i + 2, reason: "Duplicate employee" });
        continue;
      }

      const employee = await prisma.employee.create({
        data: {
          fullName,
          email: normalizedEmail,
          phone: formattedPhone,
          gender,
          nationalId: normalizedNationalId,
          address,
          jobTitle,
          dateOfBirth: new Date(dateOfBirth),
          dateOfHire: new Date(dateOfHire),
          education,
          bankAccount,
          salary: parseFloat(salary),
          createdBy: {
            connect: { id: user.useId },
          },
        },
      });

      createdEmployees.push(employee);
    }

    // Delete Excel file after processing
    fs.unlinkSync(filePath);

    return res.status(201).json({
      message: `${createdEmployees.length} employees created successfully.`,
      created: createdEmployees.length,
      skipped: skippedEmployees.length,
      skippedDetails: skippedEmployees,
    });
  } catch (error) {
    console.error("Excel employee upload error:", error);
    return res
      .status(500)
      .json({ message: "Server error while uploading employees" });
  }
};

export const getAllEmployees = async (_req: Request, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      include: {
        createdBy: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({ employees });
  } catch (error) {
    console.error("Get all employees error:", error);
    res.status(500).json({ message: "Failed to retrieve employees" });
  }
};
// get employee by Id
export const getEmployeeById = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        createdBy: {
          select: { id: true, username: true },
        },
      },
    });

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    res.status(200).json({ employee });
  } catch (error) {
    console.error("Get employee by ID error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//update employee.
export const updateEmployee = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const {
      fullName,
      dateOfBirth,
      gender,
      phone,
      email,
      address,
      jobTitle,
      dateOfHire,
      education,
      bankAccount,
      salary,
      appraisalRecords,
      disciplinaryActions,
    } = req.body;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existingEmployee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        fullName,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        phone,
        email,
        address,
        jobTitle,
        dateOfHire: dateOfHire ? new Date(dateOfHire) : undefined,
        education,
        bankAccount,
        salary: salary ? parseFloat(salary) : undefined,
        appraisalRecords,
        disciplinaryActions,
      },
    });

    res.status(200).json({
      message: "Employee updated successfully",
      employee: updatedEmployee,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// delete employee.
export const deleteEmployee = async (req: Request, res: Response) => {
  try {
    const employeeId = parseInt(req.params.id);
    if (isNaN(employeeId))
      return res.status(400).json({ message: "Invalid employee ID" });

    const existing = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!existing) {
      return res.status(404).json({ message: "Employee not found" });
    }

    await prisma.employee.delete({ where: { id: employeeId } });

    res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error("Delete employee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// controllers/userController.ts

export const listParentUsers = async (req: Request, res: Response) => {
  try {
    const parents = await prisma.user.findMany({
      where: {
        role: "PARENT",
      },
      include: {
        parentStudents: true, // Include associated students
      },
    });

    res.status(200).json({ parents });
  } catch (error) {
    console.error("Error fetching parent users:", error);
    res.status(500).json({ message: "Server error fetching parent users" });
  }
};

// GET /api/students/my
// export const getMyStudents = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore
//     const user = req.user; // From auth middleware

//     // Check if user is a parent
//     if (user.role !== "PARENT") {
//       return res
//         .status(403)
//         .json({ message: "Access denied: Not a parent account" });
//     }

//     const students = await prisma.student.findMany({
//       where: {
//         parentUserId: user.id, // only their children
//       },
//     });

//     res.status(200).json({ students });
//   } catch (error) {
//     console.error("Error fetching parent's students:", error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

export const getMyStudents = async (req: Request, res: Response) => {
  try {
    // @ts-ignore — JWT decoded user info
    const user = req.user;

    if (!user || user.role !== "PARENT") {
      return res.status(403).json({ message: "Access denied" });
    }

    const parentId = user.useId; // ✅ important: use `useId`, not `user.id`

    const students = await prisma.student.findMany({
      where: {
        parentUserId: parentId, // ✅ this filters only students of the logged-in parent
      },
    });

    res.status(200).json({ students });
  } catch (error) {
    console.error("Error fetching parent's students:", error);
    res.status(500).json({ message: "Server error" });
  }
};

//

// controllers/authController.ts
import crypto from "crypto";

export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user)
      return res
        .status(404)
        .json({ message: "No user found with that email." });

    // Rate limiting logic (as you already have)

    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpires = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: tokenExpires,
        resetRequestCount: { increment: 1 },
        lastResetRequestAt: new Date(),
      },
    });

    // ✅ Send the email
    await sendResetEmail(user.email, token);

    res.status(200).json({
      message: "Reset link sent to your email address.",
    });
  } catch (error) {
    console.error("Reset token error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetPasswordWithToken = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res
        .status(400)
        .json({ message: "Token and new password are required" });

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: { gte: new Date() }, // check token not expired
      },
    });

    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });

    if (
      !validator.isStrongPassword(newPassword, {
        minLength: 6,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1,
      })
    ) {
      return res.status(400).json({
        message:
          "Password must be at least 6 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol",
      });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// export const updateUserRole = async (req: Request, res: Response) => {
//   try {
//     // @ts-ignore — user injected by auth middleware
//     const currentUser = req.user;

//     if (!currentUser || currentUser.role !== "ADMIN") {
//       return res.status(403).json({ message: "Only ADMIN can update roles." });
//     }

//     const userId = parseInt(req.params.id);
//     const { role: newRole } = req.body;

//     if (isNaN(userId)) {
//       return res.status(400).json({ message: "Invalid user ID." });
//     }

//     if (!["ADMIN", "USER"].includes(newRole)) {
//       return res
//         .status(400)
//         .json({ message: "Role can only be changed to ADMIN or USER." });
//     }

//     const targetUser = await prisma.user.findUnique({ where: { id: userId } });

//     if (!targetUser) {
//       return res.status(404).json({ message: "Target user not found." });
//     }

//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: { role: newRole },
//     });

//     return res.status(200).json({
//       message: "User role updated successfully.",
//       user: {
//         id: updatedUser.id,
//         username: updatedUser.username,
//         role: updatedUser.role,
//       },
//     });
//   } catch (error) {
//     console.error("Error updating role:", error);
//     return res.status(500).json({ message: "Server error." });
//   }
// };

// controllers/announcementController.ts
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    // @ts-ignore — user injected by auth middleware
    const currentUser = req.user;

    if (!currentUser || !["ADMIN", "ACADEMY"].includes(currentUser.role)) {
      return res
        .status(403)
        .json({ message: "Only ADMIN or ACADEMY can update roles." });
    }

    const userId = parseInt(req.params.id);
    const { role: newRole } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ message: "Invalid user ID." });
    }

    const allowedRoles = [
      "ADMIN",
      "USER",
      "Teacher",
      "PARENT",
      "PENDING",
      "ACADEMY",
      "ATTENDANCE",
    ];
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({
        message: `Role can only be changed to one of: ${allowedRoles.join(
          ", "
        )}.`,
      });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });

    if (!targetUser) {
      return res.status(404).json({ message: "Target user not found." });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });

    return res.status(200).json({
      message: "User role updated successfully.",
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating role:", error);
    return res.status(500).json({ message: "Server error." });
  }
};

export const createAnnouncement = async (req: Request, res: Response) => {
  const { title, message, targetRole, startDate, endDate } = req.body;
  //@ts-ignore
  const userId = req.user.useId;

  try {
    const announcement = await prisma.announcement.create({
      data: {
        title,
        message,
        targetRole,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdById: userId,
      },
    });

    res.status(201).json(announcement);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create announcement." });
  }
};

export const getAnnouncements = async (req: Request, res: Response) => {
  //@ts-ignore
  const userRole = req.user.role;
  const now = new Date();

  try {
    const announcements = await prisma.announcement.findMany({
      where: {
        targetRole: userRole,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate time left for each announcement
    const enhancedAnnouncements = announcements.map((a) => {
      const timeDiff = new Date(a.endDate).getTime() - now.getTime();

      const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
      const minutesLeft = Math.floor((timeDiff / (1000 * 60)) % 60);

      return {
        ...a,
        timeRemaining: `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`,
        daysLeft,
        hoursLeft,
        minutesLeft,
      };
    });

    res.status(200).json(enhancedAnnouncements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch announcements." });
  }
};

export const getAllAnnouncementsForAdmin = async (
  req: Request,
  res: Response
) => {
  //@ts-ignore
  const userRole = req.user.role;

  const now = new Date();

  try {
    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    // Enhance with time remaining info
    const enhancedAnnouncements = announcements.map((a) => {
      const timeDiff = new Date(a.endDate).getTime() - now.getTime();

      const daysLeft = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hoursLeft = Math.floor((timeDiff / (1000 * 60 * 60)) % 24);
      const minutesLeft = Math.floor((timeDiff / (1000 * 60)) % 60);

      return {
        ...a,
        timeRemaining:
          timeDiff > 0
            ? `${daysLeft}d ${hoursLeft}h ${minutesLeft}m`
            : "Expired",
        daysLeft: timeDiff > 0 ? daysLeft : 0,
        hoursLeft: timeDiff > 0 ? hoursLeft : 0,
        minutesLeft: timeDiff > 0 ? minutesLeft : 0,
        isExpired: timeDiff <= 0,
      };
    });

    res.status(200).json(enhancedAnnouncements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch all announcements." });
  }
};

// Update (edit) announcement
export const updateAnnouncement = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { title, message, targetRole, startDate, endDate } = req.body;

  try {
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        title,
        message,
        targetRole,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update announcement." });
  }
};

// Delete announcement
export const deleteAnnouncement = async (req: Request, res: Response) => {
  const id = Number(req.params.id);

  try {
    await prisma.announcement.delete({ where: { id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete announcement." });
  }
};

//Generate Token and Referesh Token?

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing." });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET_KEY as string
    ) as { useId: number };

    const user = await prisma.user.findUnique({ where: { id: decoded.useId } });

    if (!user) {
      return res.status(403).json({ message: "User not found." });
    }

    const accessPayload = {
      useId: user.id,
      userName: user.username,
      joined_at: user.createdAt,
      role: user.role,
    };

    const newAccessToken = jwt.sign(
      accessPayload,
      process.env.JWT_SECRET_KEY as string,
      {
        issuer: "Api.Irshaad.com",
        expiresIn: "5m", // or 15m
      }
    );

    return res.status(200).json({
      Access_token: newAccessToken, // ✅ exact format you asked for
    });
  } catch (error) {
    console.error("Refresh error:", error);
    return res
      .status(403)
      .json({ message: "Invalid or expired refresh token." });
  }
};

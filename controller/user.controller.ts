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
import validator from "validator";

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

// ─────────────────────────────────────────────────────
// Change Password
// ─────────────────────────────────────────────────────
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
    const list = await prisma.user.findMany();
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
    expiresIn: "1d",
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
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `user-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image")) cb(null, true);
  else cb(new Error("Only image files are allowed!"), false);
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter,
});

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

//

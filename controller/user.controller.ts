import { PrismaClient, Role, User } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { isFloat64Array } from "util/types";
import { channel } from "diagnostics_channel";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import multer from "multer";
import validator from "validator";
const SALT_ROUNDS = 12;

//interface
interface ICreateUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: Role;
  photoUrl: string;
}

export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName, phoneNumber, photoUrl } =
      req.body as ICreateUser;

    // Validate input fields
    if (!username || !password || !email || !fullName || !phoneNumber) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Validate password strength
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

    // Validate phone number
    if (!validator.isMobilePhone(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    // Normalize input
    const lowerUsername = username.toLowerCase().trim();
    const lowerEmail = email.toLowerCase().trim();
    const normalizedPhone = phoneNumber.replace(/\D/g, ""); // Remove non-digit characters

    // Check for existing user
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
      if (existingUser.username === lowerUsername) {
        return res.status(409).json({ message: "Username already exists" });
      }
      if (existingUser.email === lowerEmail) {
        return res.status(409).json({ message: "Email already exists" });
      }
      if (existingUser.phoneNumber === normalizedPhone) {
        return res.status(409).json({ message: "Phone number already exists" });
      }
    }

    // Hash password
    const hashedPassword = await bcryptjs.hash(password, SALT_ROUNDS);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username: lowerUsername,
        password: hashedPassword,
        email: lowerEmail,
        fullName: fullName.trim(),
        phoneNumber: normalizedPhone,
        photoUrl: photoUrl?.trim(),
        emailVerified: false, // Add email verification flag
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmpassword: hashedPassword,
      },
      select: {
        // Don't return sensitive data
        id: true,
        username: true,
        email: true,
        fullName: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // TODO: Send verification email
    // await sendVerificationEmail(newUser.email, newUser.id);

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

// update user photo
// Add these imports if needed

// Configure multer storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `user-${uniqueSuffix}${ext}`);
  },
});

// File filter for image only
const fileFilter = (req: any, file: any, cb: any) => {
  if (file.mimetype.startsWith("image")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter,
});

// Updated photo handler
export const uploadUserPhoto = async (req: Request, res: Response) => {
  try {
    // Get authenticated user ID
    //@ts-ignore
    const user = req.user;
    const userId = user.useId;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    // Rest of your code remains the same...
    const photoUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    const updatedUser = await prisma.user.update({
      where: { id: userId }, // Now properly defined
      data: {
        photoUrl: photoUrl,
        photoUpdatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        photoUrl: true,
        photoUpdatedAt: true,
      },
    });

    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    console.error("Photo upload error:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to upload photo",
    });
  }
};

// create login User

export const login = async (req: Request, res: Response) => {
  try {
    const { password, email } = req.body as {
      password: string;
      email: string;
    };

    if (!password || !email) {
      return res.status(400).json({
        message: "Username and password is required",
      });
    }

    // check if the user Is existing
    const checkUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
      },
    });

    if (!checkUser) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    // check if the password is correct
    const isValidPassword = bcryptjs.compareSync(password, checkUser.password);

    if (!isValidPassword) {
      return res.status(401).json({
        message: "Incorrect email or password.",
      });
    }

    res.status(200).json({
      message: "Successfully logged in!",
      user: {
        id: checkUser.id,
        email: checkUser.email,
        username: checkUser.username,
        fullname: checkUser.fullName,
      },
      Access_token: genarateToken(checkUser),
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to login. Please contact support team.",
    });
  }
};
// change user password.

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userId, oldPassword, newPassword } = req.body;

    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { id: +userId },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 2. Verify old password
    const isPasswordValid = bcryptjs.compareSync(oldPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid old password" });
    }

    // 3. Check if new password is different from old password
    if (oldPassword === newPassword) {
      return res.status(400).json({
        message: "New password must be different from old password",
      });
    }

    // 4. Hash new password
    const hashedNewPassword = bcryptjs.hashSync(newPassword);

    // 5. Update password in database
    const updatedUser = await prisma.user.update({
      where: { id: +userId },
      data: {
        password: hashedNewPassword,
        confirmpassword: hashedNewPassword,
      },
    });

    // 6. Omit sensitive fields from response
    const { password, confirmpassword, ...safeUser } = updatedUser;

    return res.status(200).json({
      user: safeUser,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Password change error:", error);
    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

//get only one user's information.
export const userinfo = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;

    let user = await prisma.user.findFirst({
      where: {
        id: +userId,
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const { password, confirmpassword, ...rest } = user;

    res.status(200).json({
      message: "Success!",
      user: rest,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Something went wrong!",
    });
  }
};

// get All User lists

export const users = async (req: Request, res: Response) => {
  try {
    const list = await prisma.user.findMany({
      // skip: +req.query.skip,
      // take: +req.query.take,
    });

    res.json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching users" });
  }
};

//update user

export const updateUser = async (req: Request, res: Response) => {
  try {
    const { username, fullName, email, phoneNumber } = req.body as ICreateUser;
    const userid = req.params.id;
    const updateduser = await prisma.user.findFirst({
      where: {
        id: +userid,
      },
    });

    if (!updateduser) {
      return res.status(400).json({
        msg: "user not found",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: +userid,
      },
      data: {
        username,
        email,
        fullName,
        phoneNumber,
      },
    });

    res.status(200).json({
      message: "Updated user successfully",
      updateUser: {
        username,
        email,
        fullName,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating userr" });
  }
};

// delete user from the database
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userid = await req.params.id;

    let user = await prisma.user.findFirst({
      where: {
        id: +userid,
      },
    });

    if (!user) {
      return res.status(400).json({
        msg: "user not found",
      });
    }

    const deletedUser = await prisma.user.delete({
      where: {
        id: +userid,
      },
    });

    res.status(201).json({
      msg: "user deleted successfully",
      user: deletedUser,
    });
  } catch (error) {
    res.status(500).json({
      msg: "some error occurred",
    });
  }
};
const genarateToken = (username: User): string => {
  const payload = {
    useId: username.id,
    userName: username.username,
    joined_at: username.createdAt,
    role: username.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    issuer: "Api.Irshaad.com",
    expiresIn: "1d",
  });
};

export const whoami = async (req: Request, res: Response) => {
  try {
    //@ts-ignore
    const userinfo = req.user;
    res.json({
      msg: "success",
      user: userinfo,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Unauthorized3",
    });
  }
};
// get user detail
export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await prisma.user.findFirst({
      where: {
        id: +userId,
      },
    });
    if (!user) {
      return res.status(404).json({
        msg: "User not found",
      });
    }
    res.json({
      msg: "success",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      msg: "Unauthorized3",
    });
  }
};

// Get user profile
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user data" });
  }
};

// Upload user photo
export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

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

import { PrismaClient, User } from "@prisma/client";
import { Request, Response } from "express";
const prisma = new PrismaClient();
import bcryptjs from "bcryptjs";
import jwt from "jsonwebtoken";
import { isFloat64Array } from "util/types";
import { channel } from "diagnostics_channel";

//interface
interface ICreateUser {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
}

// controller functions
export const register = async (req: Request, res: Response) => {
  try {
    const { username, password, email, fullName, phoneNumber } =
      req.body as ICreateUser;

    // Convert to lowercase for case-insensitive search
    const lowerUsername = username.toLowerCase();
    const lowerEmail = email.toLowerCase();

    // Check if username or email already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username: lowerUsername }, { email: lowerEmail }],
      },
    });

    if (existingUser) {
      if (existingUser.username === lowerUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      if (existingUser.email === lowerEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
    }

    // Hash password
    const hashedPassword = bcryptjs.hashSync(password);

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        username: lowerUsername,
        password: hashedPassword,
        confirmpassword: hashedPassword,
        email: lowerEmail,
        fullName,
        phoneNumber,
      },
    });

    return res.status(201).json({
      user: newUser,
      message: "Successfully registered",
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Server is down",
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
    const { username, password, fullName, email } = req.body as ICreateUser;
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

    const hashedPassword = await bcryptjs.hash(password, 10);
    const updatedUser = await prisma.user.update({
      where: {
        id: +userid,
      },
      data: {
        username,
        password,
        confirmpassword: password,
        email,
        fullName,
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
    res.status(500).json({ message: "Error updating user" });
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
  };

  return jwt.sign(payload, process.env.JWT_SECRET_KEY as string, {
    issuer: "Api.Irshaad.com",
    expiresIn: "1Days",
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

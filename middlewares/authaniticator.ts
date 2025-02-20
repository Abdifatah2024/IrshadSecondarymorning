import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token =
      req.headers.authorization?.startsWith("Bearer") &&
      req.headers.authorization.split(" ")[1];

    // CHECK IF THERE IS NOT TOKEN
    if (!token) {
      return res.status(401).json({
        message: "Unauthorized" + " NO TOKEN",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);

    if (!decoded) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // @ts-ignore
    req.user = decoded;

    // FORWARD THE REQUEST TO THE NEXT FUNCTION
    next();
  } catch (error) {
    res.status(401).json({
      message: "Unauthorized",
    });
  }
};

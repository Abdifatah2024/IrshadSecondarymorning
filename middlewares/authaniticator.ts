import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);

    if (!decoded) {
      return res.status(401).json({
        message: "Invalid token. Please log in again.",
      });
    }

    // @ts-ignore
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error("Auth error:", error);

    // Specific error for expired tokens
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Session expired. Please log in again.",
        isTokenExpired: true, // Flag for frontend
      });
    }

    // Other JWT errors (malformed, invalid signature, etc.)
    res.status(401).json({
      message: "Invalid authentication. Please log in again.",
    });
  }
};

// import { PrismaClient } from "@prisma/client";

// const Prisma = new PrismaClient();

// import { NextFunction, Request, Response } from "express";

// export const autharise = (roles: string[]) => {
//   return async (req:Request res: Response, next: NextFunction) => {
//     // check if user is authenticated and has required roles
//     const user = await Prisma.user.findFirst({
//       where: {
//         //@ts-ignore
//         id: req.userid,
//       },
//     });
//   };
// };

import { Request, Response, NextFunction } from "express";

// Create a middleware to authorize based on user roles
export const authorize =
  (...allowedRoles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    // @ts-ignore
    const user = req.user;

    if (!user) {
      return res.status(403).json({ message: "Forbidden: No user info" });
    }

    if (!allowedRoles.includes(user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };

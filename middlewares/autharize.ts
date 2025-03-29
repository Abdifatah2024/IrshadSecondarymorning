import { PrismaClient } from "@prisma/client";

const Prisma = new PrismaClient();

import { NextFunction, Request, Response } from "express";

export const autharise = (roles: string[]) => {
  return async (req:Request res: Response, next: NextFunction) => {
    // check if user is authenticated and has required roles
    const user = await Prisma.user.findFirst({
      where: {
        //@ts-ignore
        id: req.userid,
      },
    });
  };
};

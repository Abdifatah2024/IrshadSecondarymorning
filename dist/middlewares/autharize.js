"use strict";
// import { PrismaClient } from "@prisma/client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
// Create a middleware to authorize based on user roles
const authorize = (...allowedRoles) => (req, res, next) => {
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
exports.authorize = authorize;

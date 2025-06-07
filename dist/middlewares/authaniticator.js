"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Access denied. No token provided.",
            });
        }
        const token = authHeader.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
        if (!decoded) {
            return res.status(401).json({
                message: "Invalid token. Please log in again.",
            });
        }
        // @ts-ignore
        req.user = decoded;
        next();
    }
    catch (error) {
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
});
exports.authenticate = authenticate;

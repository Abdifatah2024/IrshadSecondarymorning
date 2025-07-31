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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAllMonths = exports.updateMonthlyDiscountLimit = exports.getMonthlyDiscountLimit = exports.setMonthlyDiscountLimit = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
// POST /api/discount-limit
const setMonthlyDiscountLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { month, year, maxLimit } = req.body;
    try {
        const limit = yield prisma.monthlyDiscountLimit.upsert({
            where: { month_year: { month, year } },
            update: { maxLimit },
            create: { month, year, maxLimit },
        });
        res.status(201).json({ success: true, data: limit });
    }
    catch (error) {
        console.error("Set limit error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.setMonthlyDiscountLimit = setMonthlyDiscountLimit;
// GET /api/discount-limit/7/2025
const getMonthlyDiscountLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    try {
        const limit = yield prisma.monthlyDiscountLimit.findUnique({
            where: { month_year: { month, year } },
        });
        if (!limit) {
            return res.status(404).json({ message: "Limit not found" });
        }
        res.json({ success: true, data: limit });
    }
    catch (error) {
        console.error("Get limit error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.getMonthlyDiscountLimit = getMonthlyDiscountLimit;
// PUT /api/discount-limit/7/2025
const updateMonthlyDiscountLimit = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    const { maxLimit } = req.body;
    try {
        const updated = yield prisma.monthlyDiscountLimit.update({
            where: { month_year: { month, year } },
            data: { maxLimit },
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("Update limit error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});
exports.updateMonthlyDiscountLimit = updateMonthlyDiscountLimit;
// controllers/discountLimitController.ts
const seedAllMonths = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { year = new Date().getFullYear(), defaultLimit = 100 } = req.body;
    try {
        const results = [];
        for (let month = 1; month <= 12; month++) {
            const result = yield prisma.monthlyDiscountLimit.upsert({
                where: { month_year: { month, year } },
                update: {}, // don’t overwrite existing
                create: { month, year, maxLimit: defaultLimit },
            });
            results.push(result);
        }
        res.status(200).json({
            message: `Default limits applied for year ${year}`,
            data: results,
        });
    }
    catch (error) {
        console.error("Seeding failed", error);
        res
            .status(500)
            .json({ message: "Failed to set up default discount limits" });
    }
});
exports.seedAllMonths = seedAllMonths;

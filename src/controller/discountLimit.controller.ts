import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

// POST /api/discount-limit
export const setMonthlyDiscountLimit = async (req: Request, res: Response) => {
  const { month, year, maxLimit } = req.body;

  try {
    const limit = await prisma.monthlyDiscountLimit.upsert({
      where: { month_year: { month, year } },
      update: { maxLimit },
      create: { month, year, maxLimit },
    });

    res.status(201).json({ success: true, data: limit });
  } catch (error) {
    console.error("Set limit error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET /api/discount-limit/7/2025
export const getMonthlyDiscountLimit = async (req: Request, res: Response) => {
  const month = Number(req.params.month);
  const year = Number(req.params.year);

  try {
    const limit = await prisma.monthlyDiscountLimit.findUnique({
      where: { month_year: { month, year } },
    });

    if (!limit) {
      return res.status(404).json({ message: "Limit not found" });
    }

    res.json({ success: true, data: limit });
  } catch (error) {
    console.error("Get limit error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// PUT /api/discount-limit/7/2025
export const updateMonthlyDiscountLimit = async (
  req: Request,
  res: Response
) => {
  const month = Number(req.params.month);
  const year = Number(req.params.year);
  const { maxLimit } = req.body;

  try {
    const updated = await prisma.monthlyDiscountLimit.update({
      where: { month_year: { month, year } },
      data: { maxLimit },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("Update limit error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// controllers/discountLimitController.ts
export const seedAllMonths = async (req: Request, res: Response) => {
  const { year = new Date().getFullYear(), defaultLimit = 100 } = req.body;

  try {
    const results = [];

    for (let month = 1; month <= 12; month++) {
      const result = await prisma.monthlyDiscountLimit.upsert({
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
  } catch (error) {
    console.error("Seeding failed", error);
    res
      .status(500)
      .json({ message: "Failed to set up default discount limits" });
  }
};

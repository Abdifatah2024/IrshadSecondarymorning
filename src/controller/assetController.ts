import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Create Asset
 */
export const createAsset = async (req: Request, res: Response) => {
  const {
    name,
    category,
    purchaseDate,
    purchasePrice,
    depreciationRate,
    currentValue,
    purchaseCompany,
    condition,
    location,
    assignedTo,
    serialNumber,
    remarks,
  } = req.body;

  const parsedDate = new Date(purchaseDate);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid purchase date." });
  }

  try {
    const asset = await prisma.asset.create({
      data: {
        name,
        category,
        purchaseDate: parsedDate,
        purchasePrice,
        depreciationRate,
        currentValue,
        purchaseCompany,
        condition,
        location,
        assignedTo,
        serialNumber,
        remarks,
      },
    });

    res.status(201).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create asset." });
  }
};

/**
 * Get All Assets
 */
export const getAllAssets = async (_req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(assets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch assets." });
  }
};

/**
 * Get Single Asset by ID
 */
export const getAssetById = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const asset = await prisma.asset.findUnique({
      where: { id: Number(id) },
    });

    if (!asset) {
      return res.status(404).json({ message: "Asset not found." });
    }

    res.status(200).json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch asset." });
  }
};

/**
 * Update Asset
 */
export const updateAsset = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    category,
    purchaseDate,
    purchasePrice,
    depreciationRate,
    currentValue,
    purchaseCompany,
    condition,
    location,
    assignedTo,
    serialNumber,
    remarks,
  } = req.body;

  try {
    const updated = await prisma.asset.update({
      where: { id: Number(id) },
      data: {
        name,
        category,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
        purchasePrice,
        depreciationRate,
        currentValue,
        purchaseCompany,
        condition,
        location,
        assignedTo,
        serialNumber,
        remarks,
      },
    });

    res.status(200).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update asset." });
  }
};

/**
 * Delete Asset
 */
export const deleteAsset = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.asset.delete({
      where: { id: Number(id) },
    });

    res.status(200).json({ message: "Asset deleted successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete asset." });
  }
};

/**
 * Get Professional Asset Report
 */
export const getAssetReport = async (_req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany();

    const totalAssets = assets.length;

    const totalPurchaseValue = assets.reduce(
      (sum, asset) => sum + (asset.purchasePrice || 0),
      0
    );
    const totalCurrentValue = assets.reduce(
      (sum, asset) => sum + (asset.currentValue || 0),
      0
    );

    const byCategory: Record<string, number> = {};
    const byCondition: Record<string, number> = {};

    assets.forEach((asset) => {
      byCategory[asset.category] = (byCategory[asset.category] || 0) + 1;
      byCondition[asset.condition] = (byCondition[asset.condition] || 0) + 1;
    });

    const topValuable = [...assets]
      .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0))
      .slice(0, 5);

    res.status(200).json({
      generatedAt: new Date(),
      totalAssets,
      totalPurchaseValue,
      totalCurrentValue,
      byCategory,
      byCondition,
      topValuable,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to generate asset report." });
  }
};

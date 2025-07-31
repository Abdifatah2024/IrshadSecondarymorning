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
exports.getAssetByAssetNumber = exports.getAssetReport = exports.deleteAsset = exports.updateAsset = exports.getAssetById = exports.getAllAssets = exports.createAsset = void 0;
const client_1 = require("@prisma/client");
const generateAssetNumber_1 = require("../Utils/generateAssetNumber");
const prisma = new client_1.PrismaClient();
/**
 * Create Asset with Unique Asset Number
 */
const createAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { name, category, purchaseDate, purchasePrice, depreciationRate, currentValue, purchaseCompany, condition, location, assignedTo, serialNumber, remarks, } = req.body;
    const parsedDate = new Date(purchaseDate);
    if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid purchase date." });
    }
    try {
        // Generate a unique asset number like ASSET-20250720-0001
        const assetNumber = yield (0, generateAssetNumber_1.generateAssetNumber)(prisma);
        const asset = yield prisma.asset.create({
            data: {
                assetNumber,
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to create asset." });
    }
});
exports.createAsset = createAsset;
/**
 * Get All Assets
 */
const getAllAssets = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield prisma.asset.findMany({
            orderBy: { createdAt: "desc" },
        });
        res.status(200).json(assets);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch assets." });
    }
});
exports.getAllAssets = getAllAssets;
/**
 * Get Single Asset by ID
 */
const getAssetById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const asset = yield prisma.asset.findUnique({
            where: { id: Number(id) },
        });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found." });
        }
        res.status(200).json(asset);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch asset." });
    }
});
exports.getAssetById = getAssetById;
/**
 * Update Asset
 */
const updateAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { name, category, purchaseDate, purchasePrice, depreciationRate, currentValue, purchaseCompany, condition, location, assignedTo, serialNumber, remarks, } = req.body;
    try {
        const updated = yield prisma.asset.update({
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update asset." });
    }
});
exports.updateAsset = updateAsset;
/**
 * Delete Asset
 */
const deleteAsset = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        yield prisma.asset.delete({
            where: { id: Number(id) },
        });
        res.status(200).json({ message: "Asset deleted successfully." });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to delete asset." });
    }
});
exports.deleteAsset = deleteAsset;
/**
 * Get Professional Asset Report
 */
const getAssetReport = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const assets = yield prisma.asset.findMany();
        const totalAssets = assets.length;
        const totalPurchaseValue = assets.reduce((sum, asset) => sum + (asset.purchasePrice || 0), 0);
        const totalCurrentValue = assets.reduce((sum, asset) => sum + (asset.currentValue || 0), 0);
        const byCategory = {};
        const byCondition = {};
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to generate asset report." });
    }
});
exports.getAssetReport = getAssetReport;
/**
 * Get Asset by Asset Number
 */
const getAssetByAssetNumber = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { assetNumber } = req.params;
    try {
        const asset = yield prisma.asset.findUnique({
            where: { assetNumber },
        });
        if (!asset) {
            return res
                .status(404)
                .json({ message: "Asset not found with that number." });
        }
        res.status(200).json(asset);
    }
    catch (error) {
        console.error("Error fetching asset by number:", error);
        res.status(500).json({ message: "Failed to fetch asset." });
    }
});
exports.getAssetByAssetNumber = getAssetByAssetNumber;

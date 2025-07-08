import express from "express";
import {
  createAsset,
  getAllAssets,
  getAssetById,
  updateAsset,
  deleteAsset,
  getAssetReport,
} from "../controller/assetController";

const router = express.Router();

router.post("/assets", createAsset);
router.get("/assets", getAllAssets);
router.get("/assets/report", getAssetReport);
router.get("/assets/:id", getAssetById);
router.put("/assets/:id", updateAsset);
router.delete("/assets/:id", deleteAsset);

export default router;

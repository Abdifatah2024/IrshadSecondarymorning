"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const assetController_1 = require("../controller/assetController");
const router = express_1.default.Router();
router.post("/assets", assetController_1.createAsset);
router.get("/assets", assetController_1.getAllAssets);
router.get("/assets/report", assetController_1.getAssetReport);
router.get("/assets/:id", assetController_1.getAssetById);
router.put("/assets/:id", assetController_1.updateAsset);
router.delete("/assets/:id", assetController_1.deleteAsset);
router.get("/number/:assetNumber", assetController_1.getAssetByAssetNumber);
exports.default = router;

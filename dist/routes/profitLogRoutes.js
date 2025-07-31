"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/profitLogRoutes.ts
const express_1 = __importDefault(require("express"));
const Ledeger_Controller_1 = require("../controller/Ledeger.Controller");
const authaniticator_1 = require("../middlewares/authaniticator");
const profitLogController_1 = require("../controller/profitLogController");
const router = express_1.default.Router();
router.post("/profitlogs", authaniticator_1.authenticate, Ledeger_Controller_1.createProfitLogAndAutoDeposit);
router.post("/create", authaniticator_1.authenticate, profitLogController_1.createProfitLog);
router.post("/auto-create", authaniticator_1.authenticate, Ledeger_Controller_1.autoCreateProfitLogAndDeposit);
exports.default = router;

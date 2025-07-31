"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const WorkPlan_Controller_1 = require("../controller/WorkPlan.Controller ");
const authaniticator_1 = require("../middlewares/authaniticator");
const router = express_1.default.Router();
router.get("/workplans-with-comments", WorkPlan_Controller_1.getAllWorkPlansWithComments);
router.post("/", WorkPlan_Controller_1.createWorkPlan);
router.get("/", WorkPlan_Controller_1.getAllWorkPlans);
router.get("/:id", WorkPlan_Controller_1.getWorkPlanById);
router.put("/:id", WorkPlan_Controller_1.updateWorkPlan);
router.delete("/:id", WorkPlan_Controller_1.deleteWorkPlan);
// workfolow comments
router.post("/workplans/:workPlanId/comments", authaniticator_1.authenticate, WorkPlan_Controller_1.createWorkPlanComment);
// 📌 Get all comments for a work plan
router.get("/workplans/:workPlanId/comments", WorkPlan_Controller_1.getCommentsForWorkPlan);
// 📌 Update a specific comment (by its author)
router.put("/comments/:commentId", WorkPlan_Controller_1.updateWorkPlanComment);
// 📌 Delete a comment (by its author)
router.delete("/comments/:commentId", WorkPlan_Controller_1.deleteWorkPlanComment);
exports.default = router;

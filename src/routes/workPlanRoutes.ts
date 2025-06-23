import express from "express";
import {
  createWorkPlan,
  getAllWorkPlans,
  getWorkPlanById,
  updateWorkPlan,
  deleteWorkPlan,
  updateWorkPlanComment,
  getCommentsForWorkPlan,
  createWorkPlanComment,
  deleteWorkPlanComment,
  getAllWorkPlansWithComments,
} from "../controller/WorkPlan.Controller ";
import { authenticate } from "../middlewares/authaniticator";

const router = express.Router();

router.get("/workplans-with-comments", getAllWorkPlansWithComments);
router.post("/", createWorkPlan);
router.get("/", getAllWorkPlans);
router.get("/:id", getWorkPlanById);
router.put("/:id", updateWorkPlan);
router.delete("/:id", deleteWorkPlan);

// workfolow comments

router.post(
  "/workplans/:workPlanId/comments",
  authenticate,
  createWorkPlanComment
);

// 📌 Get all comments for a work plan
router.get("/workplans/:workPlanId/comments", getCommentsForWorkPlan);

// 📌 Update a specific comment (by its author)
router.put("/comments/:commentId", updateWorkPlanComment);

// 📌 Delete a comment (by its author)
router.delete("/comments/:commentId", deleteWorkPlanComment);

export default router;

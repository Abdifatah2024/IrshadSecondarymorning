import express from "express";
import {
  getAbsentStudentsForToday,
  sendSMS,
  sendSMSController,
} from "../controller/sms.controller";
import { sendAbsentMessagesForToday } from "../controller/sendAbsentSMS";

const router = express.Router();

router.post("/send", sendSMSController);
router.post("/send-absent-sms", async (req, res) => {
  try {
    await sendAbsentMessagesForToday();
    res.status(200).json({ message: "Absent SMS messages sent." });
  } catch (err) {
    res.status(500).json({ message: "Error sending SMS", error: err });
  }
});
router.get("/absent-students/today", async (req, res) => {
  try {
    const students = await getAbsentStudentsForToday();
    res.status(200).json(students);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ message: "Failed to fetch absent students" });
  }
});

router.post("/sms", sendSMS);

export default router;

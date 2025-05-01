import { Router } from "express";

import {
  login,
  register,
  userinfo,
  users,
  updateUser,
  deleteUser,
  whoami,
  getUser,
  changePassword,
  uploadUserPhoto,
  getUserProfile,
  uploadPhoto,
} from "../controller/user.controller";
import { authenticate } from "../middlewares/authaniticator";
import upload from "../src/config/multer";
import {
  sendResetCode,
  verifyResetCodeAndChangePassword,
} from "../controller/authController";

// import { authenticate } from ";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/userinfo/:id", userinfo);
router.get("/userinfo/:id", getUser);
router.get("/list", users);
router.post(
  "/upload-photo",
  authenticate,
  upload.single("photo"), // 'photo' matches the field name
  uploadUserPhoto
);
router.put("/changepassword", changePassword);
router.put("/:id", updateUser);

router.delete("/:id", deleteUser);
router.get("/whoami", authenticate, whoami);

//reset password.
router.post("/send-reset-code", sendResetCode); // Send reset code
router.post("/verify-reset-code", verifyResetCodeAndChangePassword); // Verify token + reset password

/// user photo and profile.
router.get("/photo/:userId", getUserProfile);
router.post("/:userId/photo", upload.single("photo"), uploadPhoto);
export default router;

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
} from "../controller/user.controller";
import { authenticate } from "../middlewares/authaniticator";
import upload from "../src/config/multer";

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

export default router;

import { Router } from "express";

import {
  login,
  register,
  userinfo,
  users,
  updateUser,
  deleteUser,
  whoami,
} from "../controller/user.controller";
import { authenticate } from "../middlewares/authaniticator";

// import { authenticate } from ";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/userinfo/:id", userinfo);
router.get("/list", users);
router.put("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/whoami", authenticate, whoami);

export default router;

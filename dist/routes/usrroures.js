"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
// Middleware
const authaniticator_1 = require("../middlewares/authaniticator"); // ✅ Consider renaming to "authenticate.ts" for clarity
const multer_1 = __importDefault(require("../src/config/multer"));
// Controllers
const user_controller_1 = require("../controller/user.controller");
const authController_1 = require("../controller/authController");
const router = (0, express_1.Router)();
/* --------------------------- Auth & Profile --------------------------- */
router.post("/register", user_controller_1.register);
router.post("/login", user_controller_1.login);
router.get("/whoami", authaniticator_1.authenticate, user_controller_1.whoami);
/* ---------------------------- User CRUD ---------------------------- */
router.get("/userinfo/:id", user_controller_1.userinfo);
router.get("/userinfo/:id", user_controller_1.getUser);
router.get("/list", user_controller_1.users);
router.put("/:id", user_controller_1.updateUser);
router.delete("/:id", user_controller_1.deleteUser);
/* ---------------------------- Password ---------------------------- */
router.put("/changepassword", user_controller_1.changePassword);
router.post("/send-reset-code", authController_1.sendResetCode);
router.post("/verify-reset-code", authController_1.verifyResetCodeAndChangePassword);
/* ---------------------------- Uploads ---------------------------- */
router.post("/upload-photo", authaniticator_1.authenticate, multer_1.default.single("photo"), user_controller_1.uploadUserPhoto);
router.get("/photo/:userId", user_controller_1.getUserProfile);
router.post("/:userId/photo", multer_1.default.single("photo"), user_controller_1.uploadPhoto);
/* ---------------------------- Employee ---------------------------- */
router.post("/employees", authaniticator_1.authenticate, user_controller_1.createEmployee);
router.get("/employees", user_controller_1.getAllEmployees);
router.get("/employees/:id", user_controller_1.getEmployeeById);
router.put("/employees/:id", user_controller_1.updateEmployee);
router.delete("/employees/:id", user_controller_1.deleteEmployee);
router.get("/my", authaniticator_1.authenticate, user_controller_1.getMyStudents);
router.get("/parents", user_controller_1.listParentUsers); // GET /api/users/parents
router.post("/password-reset/request", user_controller_1.requestPasswordReset);
router.post("/password-reset/confirm", user_controller_1.resetPasswordWithToken);
exports.default = router;

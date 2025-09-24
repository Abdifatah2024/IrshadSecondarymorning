import { Router } from "express";
// Middleware
import { authenticate } from "../middlewares/authaniticator"; // ✅ Consider renaming to "authenticate.ts" for clarity
// import upload from "../config/multer";
import { uploadImage, uploadPdf, uploadExcel } from "../config/multer";

// Controllers
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
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  listParentUsers,
  getMyStudents,
  requestPasswordReset,
  resetPasswordWithToken,
  updateUserRole,
  uploadPdfFile,
  getAllDocuments,
  deleteUserDocument,
  GetTeachers,
  createAnnouncement,
  getAnnouncements,
  getAllAnnouncementsForAdmin,
  updateAnnouncement,
  deleteAnnouncement,
  refreshAccessToken,
  createMultipleEmployeesByExcel,
  // refreshAccessToken,
} from "../controller/user.controller";

import {
  sendResetCode,
  verifyResetCodeAndChangePassword,
} from "../controller/authController";
import { upload } from "../controller/StudentsRegister";

const router = Router();

/* --------------------------- Auth & Profile --------------------------- */
router.put("/changepassword", changePassword);
router.post("/register", register);
router.post("/login", login);
router.get("/whoami", authenticate, whoami);
router.post("/auth/refresh", refreshAccessToken);

/* ---------------------------- User CRUD ---------------------------- */
router.get("/userinfo/:id", userinfo);
router.get("/userinfo/:id", getUser);
router.get("/list", users);
router.get("/listTeachers", GetTeachers);

router.put("/:id", updateUser);
router.delete("/:id", deleteUser);

/* ---------------------------- Password ---------------------------- */

router.post("/send-reset-code", sendResetCode);
router.post("/verify-reset-code", verifyResetCodeAndChangePassword);

/* ---------------------------- Uploads ---------------------------- */
router.post(
  "/upload-photo",
  authenticate,
  upload.single("photo"),
  uploadUserPhoto
);

router.get("/photo/:userId", getUserProfile);
router.post("/:userId/photo", upload.single("photo"), uploadPhoto);

/* ---------------------------- Employee ---------------------------- */
router.post("/employees", authenticate, createEmployee);
router.post(
  "/upload-employees",
  authenticate,
  uploadExcel.single("file"),
  createMultipleEmployeesByExcel
);

router.get("/employees", getAllEmployees);
router.get("/employees/:id", getEmployeeById);
router.put("/employees/:id", updateEmployee);
router.delete("/employees/:id", deleteEmployee);
router.get("/my", authenticate, getMyStudents);
router.get("/parents", listParentUsers); // GET /api/users/parents
router.post("/password-reset/request", requestPasswordReset);
router.post("/password-reset/confirm", resetPasswordWithToken);
router.put("/users/:id/role", authenticate, updateUserRole);
router.post("/upload-pdf", uploadPdf.single("pdf"), uploadPdfFile);
router.get("/documents", getAllDocuments);
router.delete("/documents/:id", authenticate, deleteUserDocument);

/* ---------------------------- announcement ---------------------------- */
router.post("/announcements", authenticate, createAnnouncement);
router.get("/announcements", authenticate, getAnnouncements);
router.get("/announcements/all", authenticate, getAllAnnouncementsForAdmin);
router.put("/announcements/:id", updateAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

export default router;

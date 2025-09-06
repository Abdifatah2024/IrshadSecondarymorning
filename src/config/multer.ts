// import multer from "multer";
// import path from "path";
// import { v4 as uuidv4 } from "uuid";

// const storage = multer.diskStorage({
//   destination: "uploads/",
//   filename: (req, file, cb) => {
//     const uniqueName = uuidv4();
//     const ext = path.extname(file.originalname);
//     cb(null, `${uniqueName}${ext}`);
//   },
// });

// const upload = multer({
//   storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: (req, file, cb) => {
//     if (file.mimetype.startsWith("image")) cb(null, true);
//     else cb(new Error("Only image files allowed!"));
//   },
// });

// export default upload;
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Shared disk storage
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (_req, file, cb) => {
    const uniqueName = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueName}${ext}`);
  },
});

/* ─────────────────────────────
   File filters
───────────────────────────── */
const imageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed!"));
};

const pdfFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Only PDF files are allowed!"));
};

const excelFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const ok = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
    "text/csv",
    "application/csv",
  ].includes(file.mimetype);
  if (!ok) return cb(new Error("Only Excel/CSV files are allowed!"));
  cb(null, true);
};

/* ─────────────────────────────
   Uploaders
───────────────────────────── */
export const uploadImage = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: imageFileFilter,
});

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: pdfFileFilter,
});

export const uploadExcel = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: excelFileFilter,
});


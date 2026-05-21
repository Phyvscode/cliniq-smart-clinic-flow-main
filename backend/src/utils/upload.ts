import multer from "multer";
import path from "path";
import fs from "fs";

const ensureDir = (dir: string) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    let folder = "uploads/misc";
    if (file.fieldname === "photo")     folder = "uploads/photos";
    if (file.fieldname === "document")  folder = "uploads/documents";
    if (file.fieldname === "signature") folder = "uploads/signatures";
    ensureDir(folder);
    cb(null, folder);
  },
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

export const staffUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }).fields([
  { name: "photo",     maxCount: 1 },
  { name: "document",  maxCount: 1 },
  { name: "signature", maxCount: 1 },
]);

// Default export for routes that import it as: import staffUpload from "../middleware/upload"
export default staffUpload;
import fs from "fs";
import path from "path";
import multer from "multer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const uploadsRoot = path.join(projectRoot, "uploads");

const ensureDirectory = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const sanitizeBaseName = (filename) =>
  String(filename || "file")
    .replace(/\.[^.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "file";

const buildStoredFilename = (file) => {
  const extension = path.extname(file.originalname || "").toLowerCase();
  return `${Date.now()}-${sanitizeBaseName(file.originalname)}${extension}`;
};

const employeeUploadDirectory = path.join(uploadsRoot, "employees");
ensureDirectory(employeeUploadDirectory);

const employeeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, employeeUploadDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, buildStoredFilename(file));
  },
});

const employeeImageFileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (!allowedImageTypes.includes(file.mimetype)) {
    cb(new Error("profile_image must be a JPG, JPEG, PNG, or WEBP image"));
    return;
  }

  cb(null, true);
};

export const uploadEmployeeProfileImage = multer({
  storage: employeeStorage,
  fileFilter: employeeImageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const companyLogoDirectory = path.join(uploadsRoot, "company", "logo");
const companyDocumentsDirectory = path.join(uploadsRoot, "company", "documents");

ensureDirectory(companyLogoDirectory);
ensureDirectory(companyDocumentsDirectory);

const companyStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "company_logo") {
      cb(null, companyLogoDirectory);
      return;
    }

    if (file.fieldname === "ntn_document" || file.fieldname === "strn_document") {
      cb(null, companyDocumentsDirectory);
      return;
    }

    cb(new Error(`Unsupported upload field: ${file.fieldname}`));
  },
  filename: (req, file, cb) => {
    cb(null, buildStoredFilename(file));
  },
});

const companyAssetFileFilter = (req, file, cb) => {
  if (file.fieldname === "company_logo") {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

    if (!allowedImageTypes.includes(file.mimetype)) {
      cb(new Error("company_logo must be a JPG, JPEG, PNG, or WEBP image"));
      return;
    }

    cb(null, true);
    return;
  }

  if (file.fieldname === "ntn_document" || file.fieldname === "strn_document") {
    if (file.mimetype !== "application/pdf") {
      cb(new Error(`${file.fieldname} must be a PDF file`));
      return;
    }

    cb(null, true);
    return;
  }

  cb(new Error(`Unsupported upload field: ${file.fieldname}`));
};

export const uploadCompanyAssets = multer({
  storage: companyStorage,
  fileFilter: companyAssetFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const itemImageDirectory = path.join(uploadsRoot, "items");
ensureDirectory(itemImageDirectory);

const itemImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, itemImageDirectory);
  },
  filename: (req, file, cb) => {
    cb(null, buildStoredFilename(file));
  },
});

const itemImageFileFilter = (req, file, cb) => {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (!allowedImageTypes.includes(file.mimetype)) {
    cb(new Error("image must be a JPG, JPEG, PNG, or WEBP image"));
    return;
  }

  cb(null, true);
};

export const uploadItemImage = multer({
  storage: itemImageStorage,
  fileFilter: itemImageFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

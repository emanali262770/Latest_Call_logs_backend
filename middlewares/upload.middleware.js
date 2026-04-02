import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const profileImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "call_logs_backend/employees",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    resource_type: "image",
  },
});

export const uploadEmployeeProfileImage = multer({
  storage: profileImageStorage,
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

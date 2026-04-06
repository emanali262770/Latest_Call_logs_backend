import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

export const toPublicUploadUrl = (filePath) => {
  if (!filePath) {
    return null;
  }

  const normalizedPath = String(filePath).replace(/\\/g, "/");
  const uploadsIndex = normalizedPath.lastIndexOf("/uploads/");

  if (uploadsIndex !== -1) {
    return normalizedPath.slice(uploadsIndex);
  }

  const directUploadsIndex = normalizedPath.indexOf("uploads/");

  if (directUploadsIndex !== -1) {
    return `/${normalizedPath.slice(directUploadsIndex).replace(/\\/g, "/")}`;
  }

  return normalizedPath.startsWith("/") ? normalizedPath : `/${normalizedPath}`;
};

export const removeLocalFile = async (fileUrl) => {
  if (!fileUrl || typeof fileUrl !== "string") {
    return;
  }

  if (!fileUrl.startsWith("/uploads/")) {
    return;
  }

  const absolutePath = path.join(projectRoot, fileUrl.replace(/^\/+/, ""));

  try {
    await fs.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

import express from "express";
import {
  getCompanyProfile,
  upsertCompanyProfile,
} from "../controllers/company.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { uploadCompanyAssets } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  getCompanyProfile
);

router.put(
  "/",
  protect,
  checkPermission("SETUP.COMPANY.UPDATE"),
  uploadCompanyAssets.fields([
    { name: "company_logo", maxCount: 1 },
    { name: "ntn_document", maxCount: 1 },
    { name: "strn_document", maxCount: 1 },
  ]),
  upsertCompanyProfile
);

export default router;

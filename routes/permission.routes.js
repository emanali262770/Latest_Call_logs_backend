import express from "express";
import {
  createPermission,
  getPermissions,
} from "../controllers/permission.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

// CREATE PERMISSION
router.post(
  "/",
  protect,
  checkPermission("ACCESS.PERMISSIONS.CREATE"),
  createPermission
);

// GET PERMISSIONS
router.get(
  "/",
  protect,
  checkPermission("ACCESS.PERMISSIONS.READ"),
  getPermissions
);

export default router;
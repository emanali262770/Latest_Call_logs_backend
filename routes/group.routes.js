import express from "express";
import {
  createGroup,
  getAvailableGroupPermissions,
  getGroupPermissions,
  getGroups,
} from "../controllers/group.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

// CREATE GROUP
router.post(
  "/",
  protect,
  checkPermission("ACCESS.GROUPS.CREATE"),
  createGroup
);

// GET GROUPS
router.get(
  "/",
  protect,
  checkPermission("ACCESS.GROUPS.READ"),
  getGroups
);

// GET GROUP PERMISSIONS
router.get(
  "/:id/permissions",
  protect,
  checkPermission("ACCESS.GROUPS.READ"),
  getGroupPermissions
);

// GET AVAILABLE GROUP PERMISSIONS
router.get(
  "/:id/available-permissions",
  protect,
  checkPermission("ACCESS.GROUPS.READ"),
  getAvailableGroupPermissions
);

export default router;

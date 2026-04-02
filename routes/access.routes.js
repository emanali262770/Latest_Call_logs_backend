import express from "express";
import {
  assignPermissionToGroup,
  assignGroupToUser,
  getMyPermissions,
} from "../controllers/access.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

// ASSIGN PERMISSION TO GROUP
router.post(
  "/assign-permission",
  protect,
  checkPermission("ACCESS.PERMISSIONS.ASSIGN"),
  assignPermissionToGroup
);

// ASSIGN GROUP TO USER
router.post(
  "/assign-group",
  protect,
  checkPermission("ACCESS.USERS.ASSIGN"),
  assignGroupToUser
);

// GET LOGGED-IN USER PERMISSIONS
router.get(
  "/my-permissions",
  protect,
  getMyPermissions
);

export default router;

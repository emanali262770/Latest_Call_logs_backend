import express from "express";
import {
  createGroup,
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

export default router;
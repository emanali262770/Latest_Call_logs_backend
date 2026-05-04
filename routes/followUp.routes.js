import express from "express";
import {
  getFollowUps,
  getFollowUpById,
  updateFollowUp,
  deleteFollowUp,
} from "../controllers/followUp.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("MEETINGS.FOLLOW_UP.READ"),
  getFollowUps
);

router.get(
  "/:id",
  protect,
  checkPermission("MEETINGS.FOLLOW_UP.READ"),
  getFollowUpById
);

router.put(
  "/:id",
  protect,
  checkPermission("MEETINGS.FOLLOW_UP.UPDATE"),
  updateFollowUp
);

router.delete(
  "/:id",
  protect,
  checkPermission("MEETINGS.FOLLOW_UP.DELETE"),
  deleteFollowUp
);

export default router;

import express from "express";
import {
  getMessageGroupCustomers,
  getMessageGroups,
  getMessageHistory,
  getMessageTemplates,
  previewMessage,
  sendMessage,
} from "../controllers/message.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("MEETINGS.MESSAGE.READ"),
  getMessageHistory
);

router.get(
  "/groups",
  protect,
  checkPermission("MEETINGS.MESSAGE.READ"),
  getMessageGroups
);

router.get(
  "/groups/:groupId/customers",
  protect,
  checkPermission("MEETINGS.MESSAGE.READ"),
  getMessageGroupCustomers
);

router.get(
  "/templates",
  protect,
  checkPermission("MEETINGS.MESSAGE.READ"),
  getMessageTemplates
);

router.post(
  "/preview",
  protect,
  checkPermission("MEETINGS.MESSAGE.READ"),
  previewMessage
);

router.post(
  "/send",
  protect,
  checkPermission("MEETINGS.MESSAGE.CREATE"),
  sendMessage
);

export default router;

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
  checkPermission("INVENTORY.MESSAGE.READ"),
  getMessageHistory
);

router.get(
  "/groups",
  protect,
  checkPermission("INVENTORY.MESSAGE.READ"),
  getMessageGroups
);

router.get(
  "/groups/:groupId/customers",
  protect,
  checkPermission("INVENTORY.MESSAGE.READ"),
  getMessageGroupCustomers
);

router.get(
  "/templates",
  protect,
  checkPermission("INVENTORY.MESSAGE.READ"),
  getMessageTemplates
);

router.post(
  "/preview",
  protect,
  checkPermission("INVENTORY.MESSAGE.READ"),
  previewMessage
);

router.post(
  "/send",
  protect,
  checkPermission("INVENTORY.MESSAGE.SEND"),
  sendMessage
);

export default router;

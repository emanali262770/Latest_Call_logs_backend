import express from "express";
import {
  createItemType,
  getItemTypes,
  getItemTypeById,
  updateItemType,
  deleteItemType,
} from "../controllers/itemType.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_TYPE.CREATE"),
  createItemType
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_TYPE.READ"),
  getItemTypes
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_TYPE.READ"),
  getItemTypeById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_TYPE.UPDATE"),
  updateItemType
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_TYPE.DELETE"),
  deleteItemType
);

export default router;

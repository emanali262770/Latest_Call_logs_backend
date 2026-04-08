import express from "express";
import {
  createItemDefinition,
  getItemDefinitions,
  getItemDefinitionById,
  getLowStockItemDefinitions,
  getLowStockItemDefinitionsCount,
  markLowStockItemDefinitionAsRead,
  updateItemDefinition,
  deleteItemDefinition,
} from "../controllers/itemDefinition.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { uploadItemImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.CREATE"),
  uploadItemImage.single("image"),
  createItemDefinition
);

router.get(
  "/low-stock/count",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.READ"),
  getLowStockItemDefinitionsCount
);

router.get(
  "/low-stock",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.READ"),
  getLowStockItemDefinitions
);

router.patch(
  "/low-stock/:id/read",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.READ"),
  markLowStockItemDefinitionAsRead
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.READ"),
  getItemDefinitions
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.READ"),
  getItemDefinitionById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.UPDATE"),
  uploadItemImage.single("image"),
  updateItemDefinition
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_DEFINITION.DELETE"),
  deleteItemDefinition
);

export default router;

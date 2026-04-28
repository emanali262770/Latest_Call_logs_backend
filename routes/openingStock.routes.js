import express from "express";
import {
  getOpeningStockItems,
  updateOpeningStock,
  bulkUpdateOpeningStock,
} from "../controllers/openingStock.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.OPENING_STOCK.READ"),
  getOpeningStockItems
);

router.put(
  "/bulk",
  protect,
  checkPermission("INVENTORY.OPENING_STOCK.UPDATE"),
  bulkUpdateOpeningStock
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.OPENING_STOCK.UPDATE"),
  updateOpeningStock
);

export default router;

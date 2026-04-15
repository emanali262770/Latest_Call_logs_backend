import express from "express";
import {
  createItemRate,
  deleteItemRate,
  getItemRateById,
  getItemRateItemDetails,
  getItemRateLookups,
  getItemRates,
  getSupplierQuotationId,
  updateItemRate,
} from "../controllers/itemRate.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/lookups",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.READ"),
  getItemRateLookups
);

router.get(
  "/suppliers/:supplierId/quotation-id",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.READ"),
  getSupplierQuotationId
);

router.get(
  "/items/:itemId/details",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.READ"),
  getItemRateItemDetails
);

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.CREATE"),
  createItemRate
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.READ"),
  getItemRates
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.READ"),
  getItemRateById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.UPDATE"),
  updateItemRate
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.ITEM_RATE.DELETE"),
  deleteItemRate
);

export default router;

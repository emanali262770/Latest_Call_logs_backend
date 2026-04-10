import express from "express";
import {
  getItemReportItems,
  printItemReportItemById,
  printItemReportItems,
} from "../controllers/itemReport.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_REPORT.READ"),
  getItemReportItems
);

router.get(
  "/print",
  protect,
  checkPermission("INVENTORY.ITEM_REPORT.PRINT"),
  printItemReportItems
);

router.get(
  "/:id/print",
  protect,
  checkPermission("INVENTORY.ITEM_REPORT.PRINT"),
  printItemReportItemById
);

export default router;

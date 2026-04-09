import express from "express";
import { getItemReportItems } from "../controllers/itemReport.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ITEM_REPORT.READ"),
  getItemReportItems
);

export default router;
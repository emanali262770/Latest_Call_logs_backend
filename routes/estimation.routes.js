import express from "express";
import {
  createEstimation,
  deleteEstimation,
  getEstimationById,
  getEstimations,
  printEstimationById,
  printEstimations,
  updateEstimation,
} from "../controllers/estimation.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.ESTIMATION.CREATE"),
  createEstimation
);

router.get(
  "/print",
  protect,
  checkPermission("INVENTORY.ESTIMATION.PRINT"),
  printEstimations
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.ESTIMATION.READ"),
  getEstimations
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.ESTIMATION.READ"),
  getEstimationById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.ESTIMATION.UPDATE"),
  updateEstimation
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.ESTIMATION.DELETE"),
  deleteEstimation
);

router.get(
  "/:id/print",
  protect,
  checkPermission("INVENTORY.ESTIMATION.PRINT"),
  printEstimationById
);

export default router;

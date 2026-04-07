import express from "express";
import {
  createManufacturer,
  getManufacturers,
  getManufacturerById,
  updateManufacturer,
  deleteManufacturer,
} from "../controllers/manufacturer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.MANUFACTURER.CREATE"),
  createManufacturer
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.MANUFACTURER.READ"),
  getManufacturers
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.MANUFACTURER.READ"),
  getManufacturerById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.MANUFACTURER.UPDATE"),
  updateManufacturer
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.MANUFACTURER.DELETE"),
  deleteManufacturer
);

export default router;

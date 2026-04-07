import express from "express";
import {
  createLocation,
  getLocations,
  getLocationById,
  updateLocation,
  deleteLocation,
} from "../controllers/location.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.LOCATION.CREATE"),
  createLocation
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.LOCATION.READ"),
  getLocations
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.LOCATION.READ"),
  getLocationById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.LOCATION.UPDATE"),
  updateLocation
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.LOCATION.DELETE"),
  deleteLocation
);

export default router;

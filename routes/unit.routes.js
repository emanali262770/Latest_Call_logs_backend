import express from "express";
import {
  createUnit,
  getUnits,
  getUnitById,
  updateUnit,
  deleteUnit,
} from "../controllers/unit.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.UNIT.CREATE"),
  createUnit
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.UNIT.READ"),
  getUnits
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.UNIT.READ"),
  getUnitById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.UNIT.UPDATE"),
  updateUnit
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.UNIT.DELETE"),
  deleteUnit
);

export default router;

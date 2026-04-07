import express from "express";
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  updateSupplier,
  deleteSupplier,
} from "../controllers/supplier.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.SUPPLIER.CREATE"),
  createSupplier
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.SUPPLIER.READ"),
  getSuppliers
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUPPLIER.READ"),
  getSupplierById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUPPLIER.UPDATE"),
  updateSupplier
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUPPLIER.DELETE"),
  deleteSupplier
);

export default router;

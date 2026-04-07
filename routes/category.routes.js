import express from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.CATEGORY.CREATE"),
  createCategory
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.CATEGORY.READ"),
  getCategories
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.CATEGORY.READ"),
  getCategoryById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.CATEGORY.UPDATE"),
  updateCategory
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.CATEGORY.DELETE"),
  deleteCategory
);

export default router;

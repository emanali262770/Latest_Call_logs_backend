import express from "express";
import {
  createSubCategory,
  getSubCategories,
  getSubCategoryById,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subCategory.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.SUB_CATEGORY.CREATE"),
  createSubCategory
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.SUB_CATEGORY.READ"),
  getSubCategories
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUB_CATEGORY.READ"),
  getSubCategoryById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUB_CATEGORY.UPDATE"),
  updateSubCategory
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.SUB_CATEGORY.DELETE"),
  deleteSubCategory
);

export default router;

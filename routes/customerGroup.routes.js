import express from "express";
import {
  createCustomerGroup,
  deleteCustomerGroup,
  getCustomerGroupById,
  getCustomerGroups,
  updateCustomerGroup,
} from "../controllers/customerGroup.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.CUSTOMER_GROUP.CREATE"),
  createCustomerGroup
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.CUSTOMER_GROUP.READ"),
  getCustomerGroups
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER_GROUP.READ"),
  getCustomerGroupById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER_GROUP.UPDATE"),
  updateCustomerGroup
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER_GROUP.DELETE"),
  deleteCustomerGroup
);

export default router;

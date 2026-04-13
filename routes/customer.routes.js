import express from "express";
import {
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../controllers/customer.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.CUSTOMER.CREATE"),
  createCustomer
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.CUSTOMER.READ"),
  getCustomers
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER.READ"),
  getCustomerById
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER.UPDATE"),
  updateCustomer
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.CUSTOMER.DELETE"),
  deleteCustomer
);

export default router;

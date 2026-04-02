import express from "express";
import {
  createBank,
  getBanks,
  getBankById,
  updateBank,
  deleteBank,
} from "../controllers/bank.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.BANK.CREATE"),
  createBank
);

router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.BANK.READ"),
  getBanks
);

router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.BANK.READ"),
  getBankById
);

router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.BANK.UPDATE"),
  updateBank
);

router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.BANK.DELETE"),
  deleteBank
);

export default router;

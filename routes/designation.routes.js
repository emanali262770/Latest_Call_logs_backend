import express from "express";
import {
  createDesignation,
  getDesignations,
  getDesignationById,
  updateDesignation,
  deleteDesignation,
} from "../controllers/designation.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.DESIGNATION.CREATE"),
  createDesignation
);

router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.DESIGNATION.READ"),
  getDesignations
);

router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DESIGNATION.READ"),
  getDesignationById
);

router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DESIGNATION.UPDATE"),
  updateDesignation
);

router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DESIGNATION.DELETE"),
  deleteDesignation
);

export default router;

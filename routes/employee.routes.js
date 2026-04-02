import express from "express";
import {
  createEmployee,
  getEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/employee.controller.js";

import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import { uploadEmployeeProfileImage } from "../middlewares/upload.middleware.js";

const router = express.Router();

// CREATE EMPLOYEE
router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE.CREATE"),
  uploadEmployeeProfileImage.single("profile_image"),
  createEmployee
);

// GET ALL
router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE.READ"),
  getEmployees
);

// GET BY ID
router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE.READ"),
  getEmployeeById
);

// UPDATE
router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE.UPDATE"),
  uploadEmployeeProfileImage.single("profile_image"),
  updateEmployee
);

// DELETE
router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE.DELETE"),
  deleteEmployee
);

export default router;

import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} from "../controllers/department.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.DEPARTMENT.CREATE"),
  createDepartment
);

router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.DEPARTMENT.READ"),
  getDepartments
);

router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DEPARTMENT.READ"),
  getDepartmentById
);

router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DEPARTMENT.UPDATE"),
  updateDepartment
);

router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DEPARTMENT.DELETE"),
  deleteDepartment
);

export default router;

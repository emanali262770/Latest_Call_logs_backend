import express from "express";
import {
  createEmployeeType,
  getEmployeeTypes,
  getEmployeeTypeById,
  updateEmployeeType,
  deleteEmployeeType,
} from "../controllers/employeeType.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE_TYPE.CREATE"),
  createEmployeeType
);

router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE_TYPE.READ"),
  getEmployeeTypes
);

router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE_TYPE.READ"),
  getEmployeeTypeById
);

router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE_TYPE.UPDATE"),
  updateEmployeeType
);

router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.EMPLOYEE_TYPE.DELETE"),
  deleteEmployeeType
);

export default router;

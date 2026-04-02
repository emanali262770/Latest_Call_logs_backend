import express from "express";
import {
  createDutyShift,
  getDutyShifts,
  getDutyShiftById,
  updateDutyShift,
  deleteDutyShift,
} from "../controllers/dutyShift.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("EMPLOYEE.DUTY_SHIFT.CREATE"),
  createDutyShift
);

router.get(
  "/",
  protect,
  checkPermission("EMPLOYEE.DUTY_SHIFT.READ"),
  getDutyShifts
);

router.get(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DUTY_SHIFT.READ"),
  getDutyShiftById
);

router.put(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DUTY_SHIFT.UPDATE"),
  updateDutyShift
);

router.delete(
  "/:id",
  protect,
  checkPermission("EMPLOYEE.DUTY_SHIFT.DELETE"),
  deleteDutyShift
);

export default router;

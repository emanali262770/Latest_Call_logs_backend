import express from "express";
import {
  createService,
  getServices,
  getActiveServices,
  getServiceById,
  updateService,
  deleteService,
} from "../controllers/service.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  checkPermission("SERVICES.SERVICE.CREATE"),
  createService
);

router.get(
  "/active",
  protect,
  checkPermission("SERVICES.SERVICE.READ"),
  getActiveServices
);

router.get(
  "/",
  protect,
  checkPermission("SERVICES.SERVICE.READ"),
  getServices
);

router.get(
  "/:id",
  protect,
  checkPermission("SERVICES.SERVICE.READ"),
  getServiceById
);

router.put(
  "/:id",
  protect,
  checkPermission("SERVICES.SERVICE.UPDATE"),
  updateService
);

router.delete(
  "/:id",
  protect,
  checkPermission("SERVICES.SERVICE.DELETE"),
  deleteService
);

export default router;

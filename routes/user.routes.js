import express from "express";


import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";
import {
  createUser,
  changeUserPassword,
  getUsers,
  getUserById,
  updateUserLock,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";

const router = express.Router();

// CREATE USER
router.post(
  "/",
  protect,
  checkPermission("ACCESS.USERS.CREATE"),
  createUser
);

// GET ALL USERS
router.get(
  "/",
  protect,
  checkPermission("ACCESS.USERS.READ"),
  getUsers
);

// CHANGE USER PASSWORD
router.put(
  "/:id/change-password",
  protect,
  checkPermission("ACCESS.USERS.UPDATE"),
  changeUserPassword
);

// LOCK OR UNLOCK USER
router.patch(
  "/:id/lock",
  protect,
  checkPermission("ACCESS.USERS.UPDATE"),
  updateUserLock
);

// GET SINGLE USER
router.get(
  "/:id",
  protect,
  checkPermission("ACCESS.USERS.READ"),
  getUserById
);

// UPDATE USER
router.put(
  "/:id",
  protect,
  checkPermission("ACCESS.USERS.UPDATE"),
  updateUser
);

// DELETE USER
router.delete(
  "/:id",
  protect,
  checkPermission("ACCESS.USERS.DELETE"),
  deleteUser
);

export default router;

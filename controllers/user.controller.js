import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import {
  createUserModel,
  generateUserCodeModel,
  getUsersModel,
  getUserByIdModel,
  getUserByEmployeeIdModel,
  getUserByUsernameModel,
  updateUserLockModel,
  updateUserPasswordModel,
  updateUserModel,
} from "../model/user.model.js";
import { getEmployeeByIdModel } from "../model/employee.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const normalizeLockValue = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return ["1", "true", "yes", "y", "locked"].includes(normalizedValue);
  }

  return fallback;
};

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { username, password, employee_id, status, lock, locked, is_locked } = req.body;
    const normalizedUsername = username?.trim();

    if (!normalizedUsername || !password || !employee_id) {
      return errorResponse(res, "username, password and employee_id are required", 400);
    }

    const employee = await getEmployeeByIdModel(employee_id);

    if (!employee) {
      return errorResponse(res, "Employee not found", 404);
    }

    const existingEmployeeUser = await getUserByEmployeeIdModel(employee_id);

    if (existingEmployeeUser) {
      return errorResponse(res, "This employee already has a user account", 409);
    }

    const existingUsername = await getUserByUsernameModel(normalizedUsername);

    if (existingUsername) {
      return errorResponse(res, "Username already exists", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const nextUserId = await generateUserCodeModel();
    const nextIsLocked = normalizeLockValue(
      lock ?? locked ?? is_locked,
      false
    );

    const result = await createUserModel({
      user_id: nextUserId,
      username: normalizedUsername,
      password: hashedPassword,
      employee_id,
      status,
      is_locked: nextIsLocked,
    });

    return successResponse(res, "User created successfully", {
      id: result.insertId,
      user_id: nextUserId,
    }, 201);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      if (error.message?.includes("user_id")) {
        return errorResponse(res, "Generated user ID already exists", 409);
      }

      return errorResponse(res, "Username already exists", 409);
    }

    return errorResponse(res, "Failed to create user", 500, error.message);
  }
};

// GET ALL USERS
export const getUsers = async (req, res) => {
  try {
    const users = await getUsersModel();
    return successResponse(res, "Users fetched successfully", users);
  } catch (error) {
    return errorResponse(res, "Failed to fetch users", 500, error.message);
  }
};

// GET USER BY ID
export const getUserById = async (req, res) => {
  try {
    const user = await getUserByIdModel(req.params.id);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "User fetched successfully", user);
  } catch (error) {
    return errorResponse(res, "Failed to fetch user", 500, error.message);
  }
};

// UPDATE USER
export const updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, password, status, lock, locked, is_locked } = req.body;
    const normalizedUsername = username?.trim();

    const user = await getUserByIdModel(userId);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    if (
      normalizedUsername &&
      normalizedUsername.toLowerCase() !== String(user.UserName).trim().toLowerCase()
    ) {
      const existingUsername = await getUserByUsernameModel(normalizedUsername);

      if (existingUsername && existingUsername.id !== Number(userId)) {
        return errorResponse(res, "Username already exists", 409);
      }
    }

    let hashedPassword = user.password;

    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const nextIsLocked = normalizeLockValue(
      lock ?? locked ?? is_locked,
      Boolean(user.is_locked)
    );

    await updateUserModel({
      id: userId,
      username: normalizedUsername || user.UserName,
      password: hashedPassword,
      status: status || user.status,
      is_locked: nextIsLocked,
    });

    return successResponse(res, "User updated successfully");
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "Username already exists", 409);
    }

    return errorResponse(res, "Failed to update user", 500, error.message);
  }
};

// CHANGE USER PASSWORD
export const changeUserPassword = async (req, res) => {
  try {
    const userId = req.params.id;
    const { password } = req.body;

    if (!password) {
      return errorResponse(res, "password is required", 400);
    }

    const user = await getUserByIdModel(userId);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await updateUserPasswordModel({
      id: userId,
      password: hashedPassword,
    });

    return successResponse(res, "Password changed successfully");
  } catch (error) {
    return errorResponse(res, "Failed to change password", 500, error.message);
  }
};

export const updateUserLock = async (req, res) => {
  try {
    const userId = req.params.id;
    const { lock, locked, is_locked } = req.body;

    if (lock === undefined && locked === undefined && is_locked === undefined) {
      return errorResponse(res, "lock is required", 400);
    }

    const user = await getUserByIdModel(userId);

    if (!user) {
      return errorResponse(res, "User not found", 404);
    }

    const nextIsLocked = normalizeLockValue(
      lock ?? locked ?? is_locked,
      Boolean(user.is_locked)
    );
    const nextStatus = nextIsLocked ? "inactive" : "active";

    await updateUserLockModel({
      id: userId,
      is_locked: nextIsLocked,
      status: nextStatus,
    });

    return successResponse(
      res,
      nextIsLocked ? "User locked successfully" : "User unlocked successfully",
      {
        id: user.id,
        user_id: user.user_id,
        is_locked: nextIsLocked,
        status: nextStatus,
      }
    );
  } catch (error) {
    return errorResponse(res, "Failed to update user lock", 500, error.message);
  }
};

// DELETE USER (Soft Delete)
export const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const [result] = await db.execute(
      `UPDATE users SET status = 'inactive' WHERE id = ?`,
      [userId]
    );

    if (result.affectedRows === 0) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "User deactivated successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete user", 500, error.message);
  }
};

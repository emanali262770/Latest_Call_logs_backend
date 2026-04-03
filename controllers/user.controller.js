import bcrypt from "bcryptjs";
import { db } from "../config/db.js";
import {
  createUserModel,
  getUsersModel,
  getUserByIdModel,
  getUserByEmployeeIdModel,
  getUserByUsernameModel,
  updateUserPasswordModel,
  updateUserModel,
} from "../model/user.model.js";
import { getEmployeeByIdModel } from "../model/employee.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

// CREATE USER
export const createUser = async (req, res) => {
  try {
    const { username, password, employee_id, status } = req.body;
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

    const result = await createUserModel({
      username: normalizedUsername,
      password: hashedPassword,
      employee_id,
      status,
    });

    return successResponse(res, "User created successfully", {
      user_id: result.insertId,
    }, 201);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
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
    const { username, password, status } = req.body;
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

    await updateUserModel({
      id: userId,
      username: normalizedUsername || user.UserName,
      password: hashedPassword,
      status: status || user.status,
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

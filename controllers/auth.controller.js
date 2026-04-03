import bcrypt from "bcryptjs";

import { generateToken } from "../utils/jwt.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { db } from "../config/db.js";
import { getUserPermissionsModel } from "../model/access.model.js";
import { getUserByUsernameModel } from "../model/user.model.js";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return errorResponse(res, "username and password are required", 400);
    }

    const user = await getUserByUsernameModel(username);

    if (!user) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    if (user.status !== "active") {
      return errorResponse(res, "User is inactive", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const resolvedUsername = user.username ?? user.UserName;

    const token = generateToken({
      id: user.id,
      username: resolvedUsername,
      employee_id: user.employee_id,
    });

    const permissionRows = await getUserPermissionsModel(user.id);
    const permissions = permissionRows.map((row) => ({
      permission_id: row.permission_id,
      key_name: row.key_name,
      module: row.module,
      sub_module: row.sub_module,
      action: row.action,
    }));

    return successResponse(res, "Login successful", {
      token,
      user: {
        id: user.id,
        username: resolvedUsername,
        employee_id: user.employee_id,
        permissions,
      },
    });
  } catch (error) {
    return errorResponse(res, "Login failed", 500, error.message);
  }
};

export const me = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT 
        u.id,
        u.UserName,
        u.status,
        u.employee_id,
        COALESCE(e.employee_name, e.first_name) AS employee_name,
        e.first_name,
        e.last_name,
        e.email,
        e.designation,
        e.department
      FROM users u
      INNER JOIN employees e ON u.employee_id = e.id
      WHERE u.id = ?
      `,
      [req.user.id]
    );

    if (!rows.length) {
      return errorResponse(res, "User not found", 404);
    }

    return successResponse(res, "Profile fetched successfully", rows[0]);
  } catch (error) {
    return errorResponse(res, "Failed to fetch profile", 500, error.message);
  }
};

import bcrypt from "bcryptjs";

import { generateToken } from "../utils/jwt.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { db } from "../config/db.js";
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

    const token = generateToken({
      id: user.id,
      username: user.UserName,
      employee_id: user.employee_id,
    });

    return successResponse(res, "Login successful", {
      token,
      user: {
        id: user.id,
        username: user.UserName,
        employee_id: user.employee_id,
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

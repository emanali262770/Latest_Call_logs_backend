import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { generateToken } from "../utils/jwt.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { db } from "../config/db.js";
import { getUserGroupsModel, getUserPermissionsModel } from "../model/access.model.js";
import { getCompanySummaryModel } from "../model/company.model.js";
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

    if (user.is_locked) {
      return errorResponse(res, "User is locked and cannot login", 403);
    }

    if (user.status !== "active") {
      return errorResponse(res, "User is inactive", 403);
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return errorResponse(res, "Invalid credentials", 401);
    }

    const groups = await getUserGroupsModel(user.id);

    if (!groups.length) {
      return errorResponse(
        res,
        "User is not assigned to any group and cannot login",
        403
      );
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
    const company = await getCompanySummaryModel();

    return successResponse(res, "Login successful", {
      token,
      user: {
        id: user.id,
        username: resolvedUsername,
        employee_id: user.employee_id,
        permissions,
      },
      company,
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
        u.user_id,
        u.UserName,
        u.status,
        u.is_locked,
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

    const company = await getCompanySummaryModel();

    return successResponse(res, "Profile fetched successfully", {
      ...rows[0],
      company,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch profile", 500, error.message);
  }
};

export const checkToken = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return errorResponse(res, "Unauthorized, token missing", 401, {
        isExpired: true,
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const company = await getCompanySummaryModel();

    return successResponse(res, "Token is valid", {
      isExpired: false,
      expiresAt: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
      user: decoded,
      company,
    });
  } catch (error) {
    const isExpired = error.name === "TokenExpiredError";

    return errorResponse(
      res,
      isExpired ? "Token has expired" : "Invalid token",
      401,
      {
        isExpired,
      }
    );
  }
};

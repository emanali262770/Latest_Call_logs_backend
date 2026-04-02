import { db } from "../config/db.js";

export const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;

      const [rows] = await db.execute(
        `
        SELECT p.key_name
        FROM user_groups ug
        INNER JOIN group_permissions gp ON ug.group_id = gp.group_id
        INNER JOIN permissions p ON gp.permission_id = p.id
        WHERE ug.user_id = ?
        `,
        [userId]
      );

      const userPermissions = rows.map((item) => item.key_name);

      if (!userPermissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${requiredPermission}`,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Permission check failed",
        error: error.message,
      });
    }
  };
};
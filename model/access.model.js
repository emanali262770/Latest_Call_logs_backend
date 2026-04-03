import { db } from "../config/db.js";

export const assignPermissionToGroupModel = async (group_id, permission_ids) => {
  const ids = Array.isArray(permission_ids) ? permission_ids : [permission_ids];

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Remove all existing permissions for this group
    await connection.execute(
      `DELETE FROM group_permissions WHERE group_id = ?`,
      [group_id]
    );

    // Insert only the new permissions
    for (const permission_id of ids) {
      await connection.execute(
        `INSERT INTO group_permissions (group_id, permission_id) VALUES (?, ?)`,
        [group_id, permission_id]
      );
    }

    await connection.commit();
    return { assigned: ids.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const assignGroupToUserModel = async (user_id, group_id) => {
  const [result] = await db.execute(
    `
    INSERT INTO user_groups (user_id, group_id)
    SELECT ?, ? FROM DUAL
    WHERE NOT EXISTS (
      SELECT 1
      FROM user_groups
      WHERE user_id = ? AND group_id = ?
    )
    `,
    [user_id, group_id, user_id, group_id]
  );

  return result;
};

export const getUserGroupsModel = async (user_id) => {
  const [rows] = await db.execute(
    `
    SELECT
      ug.group_id,
      g.group_name,
      g.description,
      g.status
    FROM user_groups ug
    INNER JOIN software_groups g ON ug.group_id = g.id
    WHERE ug.user_id = ?
    ORDER BY g.group_name ASC
    `,
    [user_id]
  );

  return rows;
};

export const getUserPermissionsModel = async (user_id) => {
  const [rows] = await db.execute(
    `
    SELECT
      ug.group_id,
      g.group_name,
      p.id AS permission_id,
      p.key_name,
      p.module,
      p.sub_module,
      p.action
    FROM user_groups ug
    INNER JOIN software_groups g ON ug.group_id = g.id
    INNER JOIN group_permissions gp ON ug.group_id = gp.group_id
    INNER JOIN permissions p ON gp.permission_id = p.id
    WHERE ug.user_id = ?
    ORDER BY ug.group_id, p.id
    `,
    [user_id]
  );

  return rows;
};

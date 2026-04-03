import { db } from "../config/db.js";

export const createGroupModel = async ({ group_name, description, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO software_groups (group_name, description, status)
    VALUES (?, ?, ?)
    `,
    [group_name, description, status || "active"]
  );

  return result;
};

export const getGroupsModel = async () => {
  const [rows] = await db.execute(`SELECT * FROM software_groups ORDER BY id DESC`);
  return rows;
};

export const getGroupByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM software_groups
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0];
};

export const getGroupPermissionsModel = async (groupId) => {
  const [rows] = await db.execute(
    `
    SELECT
      gp.group_id,
      p.id AS permission_id,
      p.module,
      p.sub_module,
      p.action,
      p.key_name,
      p.description,
      p.created_at,
      p.updated_at
    FROM group_permissions gp
    INNER JOIN permissions p ON gp.permission_id = p.id
    WHERE gp.group_id = ?
    ORDER BY p.module, p.sub_module, p.action, p.id
    `,
    [groupId]
  );

  return rows;
};

export const getAvailableGroupPermissionsModel = async (groupId) => {
  const [rows] = await db.execute(
    `
    SELECT
      p.id AS permission_id,
      p.module,
      p.sub_module,
      p.action,
      p.key_name,
      p.description,
      p.created_at,
      p.updated_at
    FROM permissions p
    WHERE NOT EXISTS (
      SELECT 1
      FROM group_permissions gp
      WHERE gp.group_id = ?
      AND gp.permission_id = p.id
    )
    ORDER BY p.module, p.sub_module, p.action, p.id
    `,
    [groupId]
  );

  return rows;
};

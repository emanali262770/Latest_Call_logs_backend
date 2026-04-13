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

export const deleteGroupModel = async (groupId) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    await connection.execute(`DELETE FROM group_permissions WHERE group_id = ?`, [
      groupId,
    ]);

    await connection.execute(`DELETE FROM user_groups WHERE group_id = ?`, [
      groupId,
    ]);

    const [result] = await connection.execute(
      `DELETE FROM software_groups WHERE id = ?`,
      [groupId]
    );

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
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
    ORDER BY
      CASE p.module
        WHEN 'EMPLOYEE' THEN 1
        WHEN 'INVENTORY' THEN 2
        WHEN 'SERVICES' THEN 3
        WHEN 'ACCESS' THEN 4
        WHEN 'SETUP' THEN 5
        ELSE 99
      END,
      CASE
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'EMPLOYEE' THEN 1
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DEPARTMENT' THEN 2
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DESIGNATION' THEN 3
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'EMPLOYEE_TYPE' THEN 4
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DUTY_SHIFT' THEN 5
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'BANK' THEN 6
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_TYPE' THEN 1
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'CATEGORY' THEN 2
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'SUB_CATEGORY' THEN 3
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'MANUFACTURER' THEN 4
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'UNIT' THEN 5
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'LOCATION' THEN 6
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'SUPPLIER' THEN 7
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'CUSTOMER' THEN 8
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_DEFINITION' THEN 9
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'OPENING_STOCK' THEN 10
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_REPORT' THEN 11
        WHEN p.module = 'SERVICES' AND p.sub_module = 'SERVICE' THEN 1
        WHEN p.module = 'ACCESS' AND p.sub_module = 'USERS' THEN 1
        WHEN p.module = 'ACCESS' AND p.sub_module = 'GROUPS' THEN 2
        WHEN p.module = 'ACCESS' AND p.sub_module = 'PERMISSIONS' THEN 3
        WHEN p.module = 'SETUP' AND p.sub_module = 'COMPANY' THEN 1
        ELSE 99
      END,
      CASE p.action
        WHEN 'CREATE' THEN 1
        WHEN 'READ' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
        WHEN 'PRINT' THEN 5
        WHEN 'ASSIGN' THEN 6
        ELSE 99
      END,
      p.id ASC
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
    ORDER BY
      CASE p.module
        WHEN 'EMPLOYEE' THEN 1
        WHEN 'INVENTORY' THEN 2
        WHEN 'SERVICES' THEN 3
        WHEN 'ACCESS' THEN 4
        WHEN 'SETUP' THEN 5
        ELSE 99
      END,
      CASE
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'EMPLOYEE' THEN 1
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DEPARTMENT' THEN 2
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DESIGNATION' THEN 3
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'EMPLOYEE_TYPE' THEN 4
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'DUTY_SHIFT' THEN 5
        WHEN p.module = 'EMPLOYEE' AND p.sub_module = 'BANK' THEN 6
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_TYPE' THEN 1
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'CATEGORY' THEN 2
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'SUB_CATEGORY' THEN 3
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'MANUFACTURER' THEN 4
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'UNIT' THEN 5
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'LOCATION' THEN 6
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'SUPPLIER' THEN 7
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'CUSTOMER' THEN 8
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_DEFINITION' THEN 9
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'OPENING_STOCK' THEN 10
        WHEN p.module = 'INVENTORY' AND p.sub_module = 'ITEM_REPORT' THEN 11
        WHEN p.module = 'SERVICES' AND p.sub_module = 'SERVICE' THEN 1
        WHEN p.module = 'ACCESS' AND p.sub_module = 'USERS' THEN 1
        WHEN p.module = 'ACCESS' AND p.sub_module = 'GROUPS' THEN 2
        WHEN p.module = 'ACCESS' AND p.sub_module = 'PERMISSIONS' THEN 3
        WHEN p.module = 'SETUP' AND p.sub_module = 'COMPANY' THEN 1
        ELSE 99
      END,
      CASE p.action
        WHEN 'CREATE' THEN 1
        WHEN 'READ' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
        WHEN 'PRINT' THEN 5
        WHEN 'ASSIGN' THEN 6
        ELSE 99
      END,
      p.id ASC
    `,
    [groupId]
  );

  return rows;
};

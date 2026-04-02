import { db } from "../config/db.js";

export const createPermissionModel = async ({
  module,
  sub_module,
  action,
  key_name,
  description,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO permissions (module, sub_module, action, key_name, description)
    VALUES (?, ?, ?, ?, ?)
    `,
    [module, sub_module, action, key_name, description ?? null]
  );

  return result;
};

export const getPermissionsModel = async () => {
  const [rows] = await db.execute(`SELECT * FROM permissions ORDER BY id DESC`);
  return rows;
};
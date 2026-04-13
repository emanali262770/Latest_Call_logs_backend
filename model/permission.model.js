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
  const [rows] = await db.execute(`
    SELECT *
    FROM permissions
    ORDER BY
      CASE module
        WHEN 'EMPLOYEE' THEN 1
        WHEN 'INVENTORY' THEN 2
        WHEN 'SERVICES' THEN 3
        WHEN 'ACCESS' THEN 4
        WHEN 'SETUP' THEN 5
        ELSE 99
      END,
      CASE
        WHEN module = 'EMPLOYEE' AND sub_module = 'EMPLOYEE' THEN 1
        WHEN module = 'EMPLOYEE' AND sub_module = 'DEPARTMENT' THEN 2
        WHEN module = 'EMPLOYEE' AND sub_module = 'DESIGNATION' THEN 3
        WHEN module = 'EMPLOYEE' AND sub_module = 'EMPLOYEE_TYPE' THEN 4
        WHEN module = 'EMPLOYEE' AND sub_module = 'DUTY_SHIFT' THEN 5
        WHEN module = 'EMPLOYEE' AND sub_module = 'BANK' THEN 6
        WHEN module = 'INVENTORY' AND sub_module = 'ITEM_TYPE' THEN 1
        WHEN module = 'INVENTORY' AND sub_module = 'CATEGORY' THEN 2
        WHEN module = 'INVENTORY' AND sub_module = 'SUB_CATEGORY' THEN 3
        WHEN module = 'INVENTORY' AND sub_module = 'MANUFACTURER' THEN 4
        WHEN module = 'INVENTORY' AND sub_module = 'UNIT' THEN 5
        WHEN module = 'INVENTORY' AND sub_module = 'LOCATION' THEN 6
        WHEN module = 'INVENTORY' AND sub_module = 'SUPPLIER' THEN 7
        WHEN module = 'INVENTORY' AND sub_module = 'CUSTOMER' THEN 8
        WHEN module = 'INVENTORY' AND sub_module = 'ITEM_DEFINITION' THEN 9
        WHEN module = 'INVENTORY' AND sub_module = 'OPENING_STOCK' THEN 10
        WHEN module = 'INVENTORY' AND sub_module = 'ITEM_REPORT' THEN 11
        WHEN module = 'SERVICES' AND sub_module = 'SERVICE' THEN 1
        WHEN module = 'ACCESS' AND sub_module = 'USERS' THEN 1
        WHEN module = 'ACCESS' AND sub_module = 'GROUPS' THEN 2
        WHEN module = 'ACCESS' AND sub_module = 'PERMISSIONS' THEN 3
        WHEN module = 'SETUP' AND sub_module = 'COMPANY' THEN 1
        ELSE 99
      END,
      CASE action
        WHEN 'CREATE' THEN 1
        WHEN 'READ' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
        WHEN 'PRINT' THEN 5
        WHEN 'ASSIGN' THEN 6
        ELSE 99
      END,
      id ASC
  `);
  return rows;
};

import "dotenv/config";
import { db } from "./config/db.js";
import { ALL_PERMISSIONS } from "./config/permissions.js";

const syncPermissions = async () => {
  try {
    let insertedPermissions = 0;

    for (const permission of ALL_PERMISSIONS) {
      const [result] = await db.execute(
        `
        INSERT INTO permissions (module, sub_module, action, key_name, description)
        SELECT ?, ?, ?, ?, ? FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1 FROM permissions WHERE key_name = ?
        )
        `,
        [
          permission.module,
          permission.sub_module,
          permission.action,
          permission.key_name,
          permission.description,
          permission.key_name,
        ]
      );

      insertedPermissions += result.affectedRows;
    }

    const [adminGroups] = await db.execute(
      `
      SELECT id, group_name
      FROM software_groups
      WHERE LOWER(group_name) = 'admin'
      `
    );

    let assignedPermissions = 0;

    for (const group of adminGroups) {
      for (const permission of ALL_PERMISSIONS) {
        const [result] = await db.execute(
          `
          INSERT INTO group_permissions (group_id, permission_id)
          SELECT ?, p.id
          FROM permissions p
          WHERE p.key_name = ?
          AND NOT EXISTS (
            SELECT 1
            FROM group_permissions gp
            WHERE gp.group_id = ?
            AND gp.permission_id = p.id
          )
          `,
          [group.id, permission.key_name, group.id]
        );

        assignedPermissions += result.affectedRows;
      }
    }

    console.log(`Permissions inserted: ${insertedPermissions}`);
    console.log(`Permissions assigned to Admin groups: ${assignedPermissions}`);

    if (!adminGroups.length) {
      console.log("No Admin group found. Permissions were synced, but not assigned to any group.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Permission sync failed:", error.message);
    process.exit(1);
  }
};

syncPermissions();

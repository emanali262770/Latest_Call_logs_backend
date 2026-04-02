import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "./config/permissions.js";

const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "call_logs_db",
});

const runSeeder = async () => {
  try {
    console.log("Seeding Admin...");

    const [existingUsers] = await db.execute(
      `
      SELECT id, employee_id
      FROM users
      WHERE UserName = ?
      LIMIT 1
      `,
      ["admin"]
    );

    let employeeId;
    let userId;

    if (existingUsers.length) {
      userId = existingUsers[0].id;
      employeeId = existingUsers[0].employee_id;
      console.log("Admin user already exists:", userId);
    } else {
      const [lastEmployeeRows] = await db.execute(
        `
        SELECT id
        FROM employees
        ORDER BY id DESC
        LIMIT 1
        `
      );

      const nextEmployeeNumber = (lastEmployeeRows[0]?.id || 0) + 1;
      const nextEmpId = `EMP-${String(nextEmployeeNumber).padStart(5, "0")}`;

      const [empResult] = await db.execute(
        `
        INSERT INTO employees (
          emp_id,
          employee_name,
          first_name,
          father_name,
          city,
          sex,
          email,
          phone,
          designation,
          department,
          employee_type,
          duty_shift,
          bank,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nextEmpId,
          "Admin User",
          "Admin User",
          "System",
          "Lahore",
          "Male",
          "admin@calllogs.com",
          "03000000000",
          "Super Admin",
          "IT",
          "Permanent",
          "Morning Shift",
          "Meezan Bank",
          "active",
        ]
      );

      employeeId = empResult.insertId;
      console.log("Employee Created:", employeeId);

      const hashedPassword = await bcrypt.hash("123456", 10);

      const [userResult] = await db.execute(
        `
        INSERT INTO users (UserName, password, employee_id, status)
        VALUES (?, ?, ?, ?)
        `,
        ["admin", hashedPassword, employeeId, "active"]
      );

      userId = userResult.insertId;
      console.log("User Created:", userId);
    }

    const [existingAdminGroups] = await db.execute(
      `
      SELECT id
      FROM software_groups
      WHERE LOWER(group_name) = 'admin'
      LIMIT 1
      `
    );

    let groupId;

    if (existingAdminGroups.length) {
      groupId = existingAdminGroups[0].id;
      console.log("Admin Group Reused:", groupId);
    } else {
      const [groupResult] = await db.execute(
        `
        INSERT INTO software_groups (group_name, status)
        VALUES (?, ?)
        `,
        ["Admin", "active"]
      );

      groupId = groupResult.insertId;
      console.log("Group Created:", groupId);
    }

    for (const permission of ALL_PERMISSIONS) {
      await db.execute(
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
    }

    console.log("Permissions seeded");

    await db.execute(
      `
      INSERT INTO group_permissions (group_id, permission_id)
      SELECT ?, id FROM permissions
      WHERE id NOT IN (
        SELECT permission_id FROM group_permissions WHERE group_id = ?
      )
      `,
      [groupId, groupId]
    );

    console.log("All permissions assigned to Admin");

    await db.execute(
      `
      INSERT INTO user_groups (user_id, group_id)
      SELECT ?, ? FROM DUAL
      WHERE NOT EXISTS (
        SELECT 1
        FROM user_groups
        WHERE user_id = ? AND group_id = ?
      )
      `,
      [userId, groupId, userId, groupId]
    );

    console.log("Admin user assigned to group");
    console.log("Admin setup complete!");
    console.log("Login Credentials:");
    console.log("username: admin");
    console.log("password: 123456");

    process.exit(0);
  } catch (error) {
    console.error("Seeder Error:", error.message);
    process.exit(1);
  }
};

runSeeder();

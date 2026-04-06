import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "./config/permissions.js";

const db = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "call_logs_db",
  port: process.env.DB_PORT || 3306,
});

const ensureLookupValue = async (table, column, value, status = "active") => {
  const [rows] = await db.execute(
    `SELECT id FROM ${table} WHERE LOWER(TRIM(${column})) = LOWER(TRIM(?)) LIMIT 1`,
    [value]
  );

  if (rows.length) {
    return rows[0].id;
  }

  const [result] = await db.execute(
    `INSERT INTO ${table} (${column}, status) VALUES (?, ?)`,
    [value, status]
  );

  return result.insertId;
};

const getNextEmployeeCode = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM employees
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextEmployeeNumber = (rows[0]?.id || 0) + 1;
  return `EMP-${String(nextEmployeeNumber).padStart(5, "0")}`;
};

const getNextUserCode = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM users
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextUserNumber = (rows[0]?.id || 0) + 1;
  return `USR-${String(nextUserNumber).padStart(5, "0")}`;
};

const runSeeder = async () => {
  try {
    console.log("Seeding Admin...");

    await ensureLookupValue("departments", "department_name", "IT");
    await ensureLookupValue("designations", "designation_name", "Super Admin");
    await ensureLookupValue("employee_types", "employee_type_name", "Permanent");
    await ensureLookupValue("duty_shifts", "duty_shift_name", "Morning Shift");
    await ensureLookupValue("banks", "bank_name", "Meezan Bank");

    const [existingUsers] = await db.execute(
      `
      SELECT id, employee_id
      FROM users
      WHERE LOWER(TRIM(UserName)) = LOWER(TRIM(?))
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
      const nextEmpId = await getNextEmployeeCode();

      const [empResult] = await db.execute(
        `
        INSERT INTO employees (
          emp_id,
          employee_name,
          first_name,
          last_name,
          father_name,
          address,
          city,
          sex,
          email,
          phone,
          mobile,
          cnic_no,
          date_of_birth,
          qualification,
          blood_group,
          designation,
          department,
          employee_type,
          hiring_date,
          duty_shift,
          bank,
          account_number,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          nextEmpId,
          "Admin User",
          "Admin",
          "User",
          "System",
          "System Address",
          "Lahore",
          "Male",
          "admin@calllogs.com",
          "03000000000",
          "03000000000",
          "35202-0000000-0",
          "1990-01-01",
          "BSCS",
          "O+",
          "Super Admin",
          "IT",
          "Permanent",
          "2024-01-01",
          "Morning Shift",
          "Meezan Bank",
          "000123456789",
          "active",
        ]
      );

      employeeId = empResult.insertId;
      console.log("Employee created:", employeeId);

      const hashedPassword = await bcrypt.hash("123456", 10);
      const nextUserId = await getNextUserCode();

      const [userResult] = await db.execute(
        `
        INSERT INTO users (user_id, UserName, password, employee_id, status, is_locked)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [nextUserId, "admin", hashedPassword, employeeId, "active", 0]
      );

      userId = userResult.insertId;
      console.log("User created:", userId);
    }

    const [existingAdminGroups] = await db.execute(
      `
      SELECT id
      FROM software_groups
      WHERE LOWER(TRIM(group_name)) = 'admin'
      LIMIT 1
      `
    );

    let groupId;

    if (existingAdminGroups.length) {
      groupId = existingAdminGroups[0].id;
      console.log("Admin group reused:", groupId);
    } else {
      const [groupResult] = await db.execute(
        `
        INSERT INTO software_groups (group_name, description, status)
        VALUES (?, ?, ?)
        `,
        ["Admin", "System administrator group", "active"]
      );

      groupId = groupResult.insertId;
      console.log("Group created:", groupId);
    }

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

    console.log("Permissions seeded:", insertedPermissions);

    const [permissionRows] = await db.execute(`SELECT id FROM permissions`);

    for (const permission of permissionRows) {
      await db.execute(
        `
        INSERT INTO group_permissions (group_id, permission_id)
        SELECT ?, ? FROM DUAL
        WHERE NOT EXISTS (
          SELECT 1
          FROM group_permissions
          WHERE group_id = ? AND permission_id = ?
        )
        `,
        [groupId, permission.id, groupId, permission.id]
      );
    }

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
    console.log("Admin setup complete");
    console.log("Login credentials:");
    console.log("username: admin");
    console.log("password: 123456");
  } catch (error) {
    console.error("Seeder error:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
};

runSeeder();

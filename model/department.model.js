import { db } from "../config/db.js";

export const createDepartmentModel = async ({ department_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO departments (department_name, status)
    VALUES (?, ?)
    `,
    [department_name.trim(), status || "active"]
  );

  return result;
};

export const getDepartmentsModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM departments
      WHERE status != 'inactive' AND department_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM departments
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getDepartmentByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM departments WHERE id = ?`, [id]);
  return rows[0];
};

export const getDepartmentByNameModel = async (department_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM departments
    WHERE LOWER(TRIM(department_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [department_name]
  );

  return rows[0];
};

export const updateDepartmentModel = async ({
  id,
  currentName,
  department_name,
  status,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      UPDATE departments
      SET department_name = ?, status = ?
      WHERE id = ?
      `,
      [department_name, status, id]
    );

    if (currentName !== department_name) {
      await connection.execute(
        `
        UPDATE employees
        SET department = ?
        WHERE department = ?
        `,
        [department_name, currentName]
      );
    }

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deleteDepartmentModel = async (department) => {
  const [employeeRows] = await db.execute(
    `
    SELECT COUNT(*) AS total
    FROM employees
    WHERE department = ? AND status = 'active'
    `,
    [department.department_name]
  );

  const assignedEmployees = employeeRows[0]?.total || 0;

  if (assignedEmployees > 0) {
    return {
      blocked: true,
      assignedEmployees,
    };
  }

  const [result] = await db.execute(`DELETE FROM departments WHERE id = ?`, [
    department.id,
  ]);

  return {
    blocked: false,
    result,
  };
};

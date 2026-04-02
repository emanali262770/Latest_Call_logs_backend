import { db } from "../config/db.js";

export const createEmployeeTypeModel = async ({ employee_type_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO employee_types (employee_type_name, status)
    VALUES (?, ?)
    `,
    [employee_type_name.trim(), status || "active"]
  );

  return result;
};

export const getEmployeeTypesModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM employee_types
      WHERE status != 'inactive' AND employee_type_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM employee_types
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getEmployeeTypeByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM employee_types WHERE id = ?`, [id]);
  return rows[0];
};

export const getEmployeeTypeByNameModel = async (employee_type_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM employee_types
    WHERE LOWER(TRIM(employee_type_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [employee_type_name]
  );

  return rows[0];
};

export const updateEmployeeTypeModel = async ({
  id,
  employee_type_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE employee_types
    SET employee_type_name = ?, status = ?
    WHERE id = ?
    `,
    [employee_type_name, status, id]
  );

  return result;
};

export const deleteEmployeeTypeModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM employee_types WHERE id = ?`, [id]);
  return result;
};

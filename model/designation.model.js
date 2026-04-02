import { db } from "../config/db.js";

export const createDesignationModel = async ({ designation_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO designations (designation_name, status)
    VALUES (?, ?)
    `,
    [designation_name.trim(), status || "active"]
  );

  return result;
};

export const getDesignationsModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM designations
      WHERE status != 'inactive' AND designation_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM designations
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getDesignationByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM designations WHERE id = ?`, [id]);
  return rows[0];
};

export const getDesignationByNameModel = async (designation_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM designations
    WHERE LOWER(TRIM(designation_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [designation_name]
  );

  return rows[0];
};

export const updateDesignationModel = async ({
  id,
  currentName,
  designation_name,
  status,
}) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    const [result] = await connection.execute(
      `
      UPDATE designations
      SET designation_name = ?, status = ?
      WHERE id = ?
      `,
      [designation_name, status, id]
    );

    if (currentName !== designation_name) {
      await connection.execute(
        `
        UPDATE employees
        SET designation = ?
        WHERE designation = ?
        `,
        [designation_name, currentName]
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

export const deleteDesignationModel = async (designation) => {
  const [employeeRows] = await db.execute(
    `
    SELECT COUNT(*) AS total
    FROM employees
    WHERE designation = ? AND status = 'active'
    `,
    [designation.designation_name]
  );

  const assignedEmployees = employeeRows[0]?.total || 0;

  if (assignedEmployees > 0) {
    return {
      blocked: true,
      assignedEmployees,
    };
  }

  const [result] = await db.execute(`DELETE FROM designations WHERE id = ?`, [
    designation.id,
  ]);

  return {
    blocked: false,
    result,
  };
};

import { db } from "../config/db.js";

export const createUnitModel = async ({ unit_name, short_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO units (unit_name, short_name, status)
    VALUES (?, ?, ?)
    `,
    [unit_name.trim(), short_name.trim(), status || "active"]
  );

  return result;
};

export const getUnitsModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM units
      WHERE status != 'inactive' AND unit_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM units
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getUnitByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM units WHERE id = ?`, [id]);
  return rows[0];
};

export const getUnitByNameModel = async (unit_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM units
    WHERE LOWER(TRIM(unit_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [unit_name]
  );

  return rows[0];
};

export const updateUnitModel = async ({
  id,
  unit_name,
  short_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE units
    SET unit_name = ?, short_name = ?, status = ?
    WHERE id = ?
    `,
    [unit_name, short_name, status, id]
  );

  return result;
};

export const deleteUnitModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM units WHERE id = ?`, [id]);
  return result;
};

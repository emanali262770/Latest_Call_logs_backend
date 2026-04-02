import { db } from "../config/db.js";

export const createDutyShiftModel = async ({ duty_shift_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO duty_shifts (duty_shift_name, status)
    VALUES (?, ?)
    `,
    [duty_shift_name.trim(), status || "active"]
  );

  return result;
};

export const getDutyShiftsModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM duty_shifts
      WHERE status != 'inactive' AND duty_shift_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM duty_shifts
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getDutyShiftByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM duty_shifts WHERE id = ?`, [id]);
  return rows[0];
};

export const getDutyShiftByNameModel = async (duty_shift_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM duty_shifts
    WHERE LOWER(TRIM(duty_shift_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [duty_shift_name]
  );

  return rows[0];
};

export const updateDutyShiftModel = async ({
  id,
  duty_shift_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE duty_shifts
    SET duty_shift_name = ?, status = ?
    WHERE id = ?
    `,
    [duty_shift_name, status, id]
  );

  return result;
};

export const deleteDutyShiftModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM duty_shifts WHERE id = ?`, [id]);
  return result;
};

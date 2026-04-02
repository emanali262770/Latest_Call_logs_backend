import { db } from "../config/db.js";

export const createBankModel = async ({ bank_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO banks (bank_name, status)
    VALUES (?, ?)
    `,
    [bank_name.trim(), status || "active"]
  );

  return result;
};

export const getBanksModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM banks
      WHERE status != 'inactive' AND bank_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM banks
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getBankByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM banks WHERE id = ?`, [id]);
  return rows[0];
};

export const getBankByNameModel = async (bank_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM banks
    WHERE LOWER(TRIM(bank_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [bank_name]
  );

  return rows[0];
};

export const updateBankModel = async ({
  id,
  bank_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE banks
    SET bank_name = ?, status = ?
    WHERE id = ?
    `,
    [bank_name, status, id]
  );

  return result;
};

export const deleteBankModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM banks WHERE id = ?`, [id]);
  return result;
};

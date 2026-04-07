import { db } from "../config/db.js";

export const createManufacturerModel = async ({ manufacturer_name, phone, address, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO manufacturers (manufacturer_name, phone, address, status)
    VALUES (?, ?, ?, ?)
    `,
    [manufacturer_name.trim(), phone || null, address || null, status || "active"]
  );

  return result;
};

export const getManufacturersModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM manufacturers
      WHERE status != 'inactive' AND manufacturer_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM manufacturers
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getManufacturerByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM manufacturers WHERE id = ?`, [id]);
  return rows[0];
};

export const getManufacturerByNameModel = async (manufacturer_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM manufacturers
    WHERE LOWER(TRIM(manufacturer_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [manufacturer_name]
  );

  return rows[0];
};

export const updateManufacturerModel = async ({
  id,
  manufacturer_name,
  phone,
  address,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE manufacturers
    SET manufacturer_name = ?, phone = ?, address = ?, status = ?
    WHERE id = ?
    `,
    [manufacturer_name, phone, address, status, id]
  );

  return result;
};

export const deleteManufacturerModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM manufacturers WHERE id = ?`, [id]);
  return result;
};

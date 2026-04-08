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

export const getManufacturersModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("manufacturer_name LIKE ?");
    params.push(`%${search}%`);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const query = `
    SELECT *
    FROM manufacturers
    ${whereClause}
    ORDER BY id DESC
  `;

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

import { db } from "../config/db.js";

export const createSupplierModel = async ({ supplier_name, phone, address, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO suppliers (supplier_name, phone, address, status)
    VALUES (?, ?, ?, ?)
    `,
    [supplier_name.trim(), phone || null, address || null, status || "active"]
  );

  return result;
};

export const getSuppliersModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("supplier_name LIKE ?");
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
    SELECT id, supplier_name AS name, phone, address, status, created_at, updated_at
    FROM suppliers
    ${whereClause}
    ORDER BY id DESC
  `;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getSupplierByIdModel = async (id) => {
  const [rows] = await db.execute(
    `SELECT id, supplier_name AS name, phone, address, status, created_at, updated_at FROM suppliers WHERE id = ?`,
    [id]
  );
  return rows[0];
};

export const getSupplierByNameModel = async (supplier_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM suppliers
    WHERE LOWER(TRIM(supplier_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [supplier_name]
  );

  return rows[0];
};

export const updateSupplierModel = async ({
  id,
  supplier_name,
  phone,
  address,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE suppliers
    SET supplier_name = ?, phone = ?, address = ?, status = ?
    WHERE id = ?
    `,
    [supplier_name, phone, address, status, id]
  );

  return result;
};

export const deleteSupplierModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM suppliers WHERE id = ?`, [id]);
  return result;
};

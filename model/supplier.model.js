import { db } from "../config/db.js";

export const generateSupplierCodeModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM suppliers
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextSupplierNumber = (rows[0]?.id || 0) + 1;
  return `SUP-${String(nextSupplierNumber).padStart(4, "0")}`;
};

export const createSupplierModel = async ({
  supplier_code,
  supplier_name,
  contact_person,
  city,
  mobile_number,
  phone,
  email,
  address,
  opening_balance,
  ob_date,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO suppliers (
      supplier_code,
      supplier_name,
      contact_person,
      city,
      mobile_number,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      supplier_code,
      supplier_name.trim(),
      contact_person,
      city,
      mobile_number,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status || "active",
    ]
  );

  return result;
};

export const getSuppliersModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(
      "(supplier_name LIKE ? OR supplier_code LIKE ? OR contact_person LIKE ? OR city LIKE ? OR phone LIKE ? OR mobile_number LIKE ?)"
    );
    const searchValue = `%${search}%`;
    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const query = `
    SELECT
      id,
      supplier_code,
      supplier_name AS name,
      supplier_name,
      contact_person,
      city,
      mobile_number,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status,
      created_at,
      updated_at
    FROM suppliers
    ${whereClause}
    ORDER BY id DESC
  `;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getSupplierByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      supplier_code,
      supplier_name AS name,
      supplier_name,
      contact_person,
      city,
      mobile_number,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status,
      created_at,
      updated_at
    FROM suppliers
    WHERE id = ?
    `,
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
  supplier_code,
  supplier_name,
  contact_person,
  city,
  mobile_number,
  phone,
  email,
  address,
  opening_balance,
  ob_date,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE suppliers
    SET
      supplier_code = ?,
      supplier_name = ?,
      contact_person = ?,
      city = ?,
      mobile_number = ?,
      phone = ?,
      email = ?,
      address = ?,
      opening_balance = ?,
      ob_date = ?,
      status = ?
    WHERE id = ?
    `,
    [
      supplier_code,
      supplier_name,
      contact_person,
      city,
      mobile_number,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status,
      id,
    ]
  );

  return result;
};

export const deleteSupplierModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM suppliers WHERE id = ?`, [id]);
  return result;
};

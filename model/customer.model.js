import { db } from "../config/db.js";

export const generateCustomerCodeModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM customers
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextCustomerNumber = (rows[0]?.id || 0) + 1;
  return `CUS-${String(nextCustomerNumber).padStart(4, "0")}`;
};

export const createCustomerModel = async ({
  customer_code,
  customer_name,
  phone,
  email,
  address,
  opening_balance,
  ob_date,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO customers (
      customer_code,
      customer_name,
      phone,
      email,
      address,
      opening_balance,
      ob_date,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      customer_code,
      customer_name.trim(),
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

export const getCustomersModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(
      "(customer_name LIKE ? OR customer_code LIKE ? OR phone LIKE ? OR email LIKE ? OR address LIKE ?)"
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `
    SELECT
      id,
      customer_code AS code,
      customer_code,
      customer_name AS name,
      customer_name,
      phone,
      email,
      address,
      opening_balance AS openingBalance,
      opening_balance,
      ob_date AS obDate,
      ob_date,
      status,
      created_at,
      updated_at
    FROM customers
    ${whereClause}
    ORDER BY id DESC
    `,
    params
  );

  return rows;
};

export const getCustomerByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      customer_code AS code,
      customer_code,
      customer_name AS name,
      customer_name,
      phone,
      email,
      address,
      opening_balance AS openingBalance,
      opening_balance,
      ob_date AS obDate,
      ob_date,
      status,
      created_at,
      updated_at
    FROM customers
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

export const getCustomerByNameModel = async (customer_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM customers
    WHERE LOWER(TRIM(customer_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [customer_name]
  );

  return rows[0];
};

export const updateCustomerModel = async ({
  id,
  customer_code,
  customer_name,
  phone,
  email,
  address,
  opening_balance,
  ob_date,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE customers
    SET
      customer_code = ?,
      customer_name = ?,
      phone = ?,
      email = ?,
      address = ?,
      opening_balance = ?,
      ob_date = ?,
      status = ?
    WHERE id = ?
    `,
    [
      customer_code,
      customer_name,
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

export const deleteCustomerModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM customers WHERE id = ?`, [id]);
  return result;
};

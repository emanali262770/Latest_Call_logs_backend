import { db } from "../config/db.js";

const customerSelectClause = `
  SELECT
    c.id,
    c.customer_group_id AS customerGroupId,
    c.customer_group_id,
    cg.group_name AS customerGroup,
    cg.group_name AS groupName,
    c.company,
    c.person,
    c.designation,
    c.department,
    c.office_address AS officeAddress,
    c.office_address,
    c.office_phone AS officePhone,
    c.office_phone,
    c.fax,
    c.residence_address AS residenceAddress,
    c.residence_address,
    c.residence_phone AS residencePhone,
    c.residence_phone,
    c.mobile,
    c.email,
    c.website,
    c.description,
    c.status,
    c.created_at AS createdAt,
    c.created_at,
    c.updated_at AS updatedAt,
    c.updated_at
  FROM customers c
  LEFT JOIN customer_groups cg ON c.customer_group_id = cg.id
`;

export const createCustomerModel = async ({
  customer_group_id,
  company,
  person,
  designation,
  department,
  office_address,
  office_phone,
  fax,
  residence_address,
  residence_phone,
  mobile,
  email,
  website,
  description,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO customers (
      customer_group_id,
      company,
      person,
      designation,
      department,
      office_address,
      office_phone,
      fax,
      residence_address,
      residence_phone,
      mobile,
      email,
      website,
      description,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      customer_group_id,
      company,
      person.trim(),
      designation,
      department,
      office_address,
      office_phone,
      fax,
      residence_address,
      residence_phone,
      mobile.trim(),
      email,
      website,
      description,
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
      `(
        COALESCE(cg.group_name, '') LIKE ?
        OR COALESCE(c.company, '') LIKE ?
        OR c.person LIKE ?
        OR COALESCE(c.designation, '') LIKE ?
        OR COALESCE(c.department, '') LIKE ?
        OR COALESCE(c.office_phone, '') LIKE ?
        OR COALESCE(c.residence_phone, '') LIKE ?
        OR c.mobile LIKE ?
        OR COALESCE(c.email, '') LIKE ?
        OR COALESCE(c.website, '') LIKE ?
      )`
    );
    const searchValue = `%${search}%`;
    params.push(
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue,
      searchValue
    );
  }

  if (status) {
    conditions.push("c.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `
    ${customerSelectClause}
    ${whereClause}
    ORDER BY c.id DESC
    `,
    params
  );

  return rows;
};

export const getCustomerByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    ${customerSelectClause}
    WHERE c.id = ?
    `,
    [id]
  );

  return rows[0];
};

export const getCustomerByPersonAndMobileModel = async (person, mobile) => {
  const [rows] = await db.execute(
    `
    SELECT id, person, mobile, status
    FROM customers
    WHERE LOWER(TRIM(person)) = LOWER(TRIM(?))
      AND LOWER(TRIM(mobile)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [person, mobile]
  );

  return rows[0];
};

export const getCustomerByCompanyModel = async (company) => {
  const [rows] = await db.execute(
    `
    SELECT id, company, status
    FROM customers
    WHERE LOWER(TRIM(company)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [company]
  );

  return rows[0];
};

export const updateCustomerModel = async ({
  id,
  customer_group_id,
  company,
  person,
  designation,
  department,
  office_address,
  office_phone,
  fax,
  residence_address,
  residence_phone,
  mobile,
  email,
  website,
  description,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE customers
    SET
      customer_group_id = ?,
      company = ?,
      person = ?,
      designation = ?,
      department = ?,
      office_address = ?,
      office_phone = ?,
      fax = ?,
      residence_address = ?,
      residence_phone = ?,
      mobile = ?,
      email = ?,
      website = ?,
      description = ?,
      status = ?
    WHERE id = ?
    `,
    [
      customer_group_id,
      company,
      person.trim(),
      designation,
      department,
      office_address,
      office_phone,
      fax,
      residence_address,
      residence_phone,
      mobile.trim(),
      email,
      website,
      description,
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

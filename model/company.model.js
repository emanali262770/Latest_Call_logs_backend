import { db } from "../config/db.js";

export const generateCompanyCodeModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM companies
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextCompanyNumber = (rows[0]?.id || 0) + 1;
  return `COM-${String(nextCompanyNumber).padStart(5, "0")}`;
};

export const getCompanyProfileModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM companies
    ORDER BY id DESC
    LIMIT 1
    `
  );

  return rows[0] || null;
};

export const getCompanySummaryModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      company_id,
      company_logo,
      company_name
    FROM companies
    ORDER BY id DESC
    LIMIT 1
    `
  );

  return rows[0] || null;
};

export const createCompanyProfileModel = async ({
  company_id,
  company_logo,
  company_name,
  phone,
  email,
  website,
  address,
  representative,
  department,
  designation,
  mobile_no,
  ntn,
  ntn_document,
  strn,
  strn_document,
  year_of_establishment,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO companies (
      company_id,
      company_logo,
      company_name,
      phone,
      email,
      website,
      address,
      representative,
      department,
      designation,
      mobile_no,
      ntn,
      ntn_document,
      strn,
      strn_document,
      year_of_establishment
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      company_id,
      company_logo,
      company_name,
      phone,
      email,
      website,
      address,
      representative,
      department,
      designation,
      mobile_no,
      ntn,
      ntn_document,
      strn,
      strn_document,
      year_of_establishment,
    ]
  );

  return result;
};

export const updateCompanyProfileModel = async ({
  id,
  company_logo,
  company_name,
  phone,
  email,
  website,
  address,
  representative,
  department,
  designation,
  mobile_no,
  ntn,
  ntn_document,
  strn,
  strn_document,
  year_of_establishment,
}) => {
  const [result] = await db.execute(
    `
    UPDATE companies
    SET
      company_logo = ?,
      company_name = ?,
      phone = ?,
      email = ?,
      website = ?,
      address = ?,
      representative = ?,
      department = ?,
      designation = ?,
      mobile_no = ?,
      ntn = ?,
      ntn_document = ?,
      strn = ?,
      strn_document = ?,
      year_of_establishment = ?
    WHERE id = ?
    `,
    [
      company_logo,
      company_name,
      phone,
      email,
      website,
      address,
      representative,
      department,
      designation,
      mobile_no,
      ntn,
      ntn_document,
      strn,
      strn_document,
      year_of_establishment,
      id,
    ]
  );

  return result;
};

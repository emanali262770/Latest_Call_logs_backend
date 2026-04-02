import { db } from "../config/db.js";

export const generateEmployeeCodeModel = async () => {
  const [rows] = await db.execute(`
    SELECT id
    FROM employees
    ORDER BY id DESC
    LIMIT 1
  `);

  const nextNumber = (rows[0]?.id || 0) + 1;
  return `EMP-${String(nextNumber).padStart(5, "0")}`;
};

export const createEmployeeModel = async ({
  emp_id,
  employee_name,
  first_name,
  last_name,
  profile_image,
  father_name,
  address,
  city,
  sex,
  email,
  phone,
  mobile,
  cnic_no,
  date_of_birth,
  qualification,
  blood_group,
  designation,
  department,
  employee_type,
  hiring_date,
  duty_shift,
  bank,
  account_number,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO employees 
    (
      emp_id,
      employee_name,
      first_name,
      last_name,
      profile_image,
      father_name,
      address,
      city,
      sex,
      email,
      phone,
      mobile,
      cnic_no,
      date_of_birth,
      qualification,
      blood_group,
      designation,
      department,
      employee_type,
      hiring_date,
      duty_shift,
      bank,
      account_number,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      emp_id,
      employee_name,
      first_name,
      last_name,
      profile_image,
      father_name,
      address,
      city,
      sex,
      email,
      phone,
      mobile,
      cnic_no,
      date_of_birth,
      qualification,
      blood_group,
      designation,
      department,
      employee_type,
      hiring_date,
      duty_shift,
      bank,
      account_number,
      status || "active",
    ]
  );

  return result;
};

export const getEmployeesModel = async () => {
  const [rows] = await db.execute(`SELECT * FROM employees ORDER BY id DESC`);
  return rows;
};

export const getEmployeeByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM employees WHERE id = ?`, [id]);
  return rows[0];
};

export const updateEmployeeModel = async ({
  id,
  emp_id,
  employee_name,
  first_name,
  last_name,
  profile_image,
  father_name,
  address,
  city,
  sex,
  email,
  phone,
  mobile,
  cnic_no,
  date_of_birth,
  qualification,
  blood_group,
  designation,
  department,
  employee_type,
  hiring_date,
  duty_shift,
  bank,
  account_number,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE employees
    SET
      emp_id = ?,
      employee_name = ?,
      first_name = ?,
      last_name = ?,
      profile_image = ?,
      father_name = ?,
      address = ?,
      city = ?,
      sex = ?,
      email = ?,
      phone = ?,
      mobile = ?,
      cnic_no = ?,
      date_of_birth = ?,
      qualification = ?,
      blood_group = ?,
      designation = ?,
      department = ?,
      employee_type = ?,
      hiring_date = ?,
      duty_shift = ?,
      bank = ?,
      account_number = ?,
      status = ?
    WHERE id = ?
    `,
    [
      emp_id,
      employee_name,
      first_name,
      last_name,
      profile_image,
      father_name,
      address,
      city,
      sex,
      email,
      phone,
      mobile,
      cnic_no,
      date_of_birth,
      qualification,
      blood_group,
      designation,
      department,
      employee_type,
      hiring_date,
      duty_shift,
      bank,
      account_number,
      status,
      id,
    ]
  );

  return result;
};

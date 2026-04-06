import { db } from "../config/db.js";

export const generateUserCodeModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT id
    FROM users
    ORDER BY id DESC
    LIMIT 1
    `
  );

  const nextUserNumber = (rows[0]?.id || 0) + 1;
  return `USR-${String(nextUserNumber).padStart(5, "0")}`;
};

// CREATE USER
export const createUserModel = async ({
  user_id,
  username,
  password,
  employee_id,
  status,
  is_locked,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO users (user_id, UserName, password, employee_id, status, is_locked)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [user_id, username, password, employee_id, status || "active", is_locked ? 1 : 0]
  );

  return result;
};

// GET ALL USERS
export const getUsersModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT 
      u.id,
      u.user_id,
      u.UserName,
      u.status,
      u.is_locked,
      u.employee_id,
      u.created_at AS createdAt,
      COALESCE(e.employee_name, e.first_name) AS employee_name,
      e.first_name,
      e.last_name,
      e.designation
    FROM users u
    INNER JOIN employees e ON u.employee_id = e.id
    ORDER BY u.id DESC
    `
  );

  return rows;
};

// GET USER BY ID
export const getUserByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT 
      u.*,
      u.created_at AS createdAt,
      COALESCE(e.employee_name, e.first_name) AS employee_name,
      e.first_name,
      e.last_name,
      e.designation
    FROM users u
    INNER JOIN employees e ON u.employee_id = e.id
    WHERE u.id = ?
    `,
    [id]
  );

  return rows[0];
};

// GET USER BY USERNAME
export const getUserByUsernameModel = async (username) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM users
    WHERE LOWER(TRIM(UserName)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [username]
  );

  return rows[0];
};

export const getUserByEmployeeIdModel = async (employee_id) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM users
    WHERE employee_id = ?
    LIMIT 1
    `,
    [employee_id]
  );

  return rows[0];
};

export const updateUserPasswordModel = async ({ id, password }) => {
  const [result] = await db.execute(
    `
    UPDATE users
    SET password = ?
    WHERE id = ?
    `,
    [password, id]
  );

  return result;
};

export const updateUserLockModel = async ({ id, is_locked, status }) => {
  const [result] = await db.execute(
    `
    UPDATE users
    SET is_locked = ?, status = ?
    WHERE id = ?
    `,
    [is_locked ? 1 : 0, status, id]
  );

  return result;
};

// UPDATE USER
export const updateUserModel = async ({
  id,
  username,
  password,
  status,
  is_locked,
}) => {
  const [result] = await db.execute(
    `
    UPDATE users
    SET UserName = ?, password = ?, status = ?, is_locked = ?
    WHERE id = ?
    `,
    [username, password, status, is_locked ? 1 : 0, id]
  );

  return result;
};

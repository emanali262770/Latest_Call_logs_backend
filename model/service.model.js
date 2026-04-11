import { db } from "../config/db.js";

export const createServiceModel = async ({ service_name, duration_time, rate, status }) => {
  const [result] = await db.execute(
    `INSERT INTO services (service_name, duration_time, rate, status) VALUES (?, ?, ?, ?)`,
    [service_name.trim(), duration_time.trim(), rate, status || "active"]
  );
  return result;
};

export const getServicesModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("service_name LIKE ?");
    params.push(`%${search}%`);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const query = `SELECT * FROM services ${whereClause} ORDER BY id DESC`;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getServiceByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM services WHERE id = ?`, [id]);
  return rows[0];
};

export const getServiceByNameModel = async (service_name) => {
  const [rows] = await db.execute(
    `SELECT * FROM services WHERE LOWER(TRIM(service_name)) = LOWER(TRIM(?)) LIMIT 1`,
    [service_name]
  );
  return rows[0];
};

export const updateServiceModel = async ({ id, service_name, duration_time, rate, status }) => {
  const [result] = await db.execute(
    `UPDATE services SET service_name = ?, duration_time = ?, rate = ?, status = ? WHERE id = ?`,
    [service_name, duration_time, rate, status, id]
  );
  return result;
};

export const deleteServiceModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM services WHERE id = ?`, [id]);
  return result;
};

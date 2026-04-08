import { db } from "../config/db.js";

export const createLocationModel = async ({ location_name, address, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO locations (location_name, address, status)
    VALUES (?, ?, ?)
    `,
    [location_name.trim(), address.trim(), status || "active"]
  );

  return result;
};

export const getLocationsModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("location_name LIKE ?");
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
    FROM locations
    ${whereClause}
    ORDER BY id DESC
  `;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getLocationByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM locations WHERE id = ?`, [id]);
  return rows[0];
};

export const getLocationByNameModel = async (location_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM locations
    WHERE LOWER(TRIM(location_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [location_name]
  );

  return rows[0];
};

export const updateLocationModel = async ({
  id,
  location_name,
  address,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE locations
    SET location_name = ?, address = ?, status = ?
    WHERE id = ?
    `,
    [location_name, address, status, id]
  );

  return result;
};

export const deleteLocationModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM locations WHERE id = ?`, [id]);
  return result;
};

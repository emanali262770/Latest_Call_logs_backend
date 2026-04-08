import { db } from "../config/db.js";

export const createCategoryModel = async ({ category_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO categories (category_name, status)
    VALUES (?, ?)
    `,
    [category_name.trim(), status || "active"]
  );

  return result;
};

export const getCategoriesModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("category_name LIKE ?");
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
    FROM categories
    ${whereClause}
    ORDER BY id DESC
  `;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getCategoryByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM categories WHERE id = ?`, [id]);
  return rows[0];
};

export const getCategoryByNameModel = async (category_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM categories
    WHERE LOWER(TRIM(category_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [category_name]
  );

  return rows[0];
};

export const updateCategoryModel = async ({
  id,
  category_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE categories
    SET category_name = ?, status = ?
    WHERE id = ?
    `,
    [category_name, status, id]
  );

  return result;
};

export const deleteCategoryModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
  return result;
};

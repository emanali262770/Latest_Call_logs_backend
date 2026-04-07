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

export const getCategoriesModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM categories
      WHERE status != 'inactive' AND category_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM categories
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
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

import { db } from "../config/db.js";

export const createSubCategoryModel = async ({ category_id, sub_category_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO sub_categories (category_id, sub_category_name, status)
    VALUES (?, ?, ?)
    `,
    [category_id, sub_category_name.trim(), status || "active"]
  );

  return result;
};

export const getSubCategoriesModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("sc.sub_category_name LIKE ?");
    params.push(`%${search}%`);
  }

  if (status) {
    conditions.push("sc.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";
  const query = `
    SELECT sc.*, c.category_name
    FROM sub_categories sc
    LEFT JOIN categories c ON sc.category_id = c.id
    ${whereClause}
    ORDER BY sc.id DESC
  `;

  const [rows] = await db.execute(query, params);
  return rows;
};

export const getSubCategoryByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    SELECT sc.*, c.category_name
    FROM sub_categories sc
    LEFT JOIN categories c ON sc.category_id = c.id
    WHERE sc.id = ?
    `,
    [id]
  );
  return rows[0];
};

export const getSubCategoryByNameAndCategoryModel = async (sub_category_name, category_id) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM sub_categories
    WHERE LOWER(TRIM(sub_category_name)) = LOWER(TRIM(?)) AND category_id = ?
    LIMIT 1
    `,
    [sub_category_name, category_id]
  );

  return rows[0];
};

export const updateSubCategoryModel = async ({
  id,
  category_id,
  sub_category_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE sub_categories
    SET category_id = ?, sub_category_name = ?, status = ?
    WHERE id = ?
    `,
    [category_id, sub_category_name, status, id]
  );

  return result;
};

export const deleteSubCategoryModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM sub_categories WHERE id = ?`, [id]);
  return result;
};

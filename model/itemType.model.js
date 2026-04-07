import { db } from "../config/db.js";

export const createItemTypeModel = async ({ item_type_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO item_types (item_type_name, status)
    VALUES (?, ?)
    `,
    [item_type_name.trim(), status || "active"]
  );

  return result;
};

export const getItemTypesModel = async (search = "") => {
  const hasSearch = Boolean(search);
  const query = hasSearch
    ? `
      SELECT *
      FROM item_types
      WHERE status != 'inactive' AND item_type_name LIKE ?
      ORDER BY id DESC
    `
    : `
      SELECT *
      FROM item_types
      WHERE status != 'inactive'
      ORDER BY id DESC
    `;

  const params = hasSearch ? [`%${search}%`] : [];
  const [rows] = await db.execute(query, params);
  return rows;
};

export const getItemTypeByIdModel = async (id) => {
  const [rows] = await db.execute(`SELECT * FROM item_types WHERE id = ?`, [id]);
  return rows[0];
};

export const getItemTypeByNameModel = async (item_type_name) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM item_types
    WHERE LOWER(TRIM(item_type_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [item_type_name]
  );

  return rows[0];
};

export const updateItemTypeModel = async ({
  id,
  item_type_name,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE item_types
    SET item_type_name = ?, status = ?
    WHERE id = ?
    `,
    [item_type_name, status, id]
  );

  return result;
};

export const deleteItemTypeModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM item_types WHERE id = ?`, [id]);
  return result;
};

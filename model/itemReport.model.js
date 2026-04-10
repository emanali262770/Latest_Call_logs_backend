import { db } from "../config/db.js";

const itemReportSelectClause = `
  SELECT
    i.id,
    i.item_code,
    i.item_name,
    CAST(i.unit_qty AS UNSIGNED) AS unit_qty,
    CAST(i.stock AS UNSIGNED) AS stock,
    i.sale_price,
    i.reorder_level,
    i.image,
    i.status,
    it.item_type_name,
    c.category_name,
    sc.sub_category_name,
    u.unit_name,
    u.short_name AS unit_short_name
  FROM item_definitions i
  INNER JOIN item_types it ON i.item_type_id = it.id
  INNER JOIN categories c ON i.category_id = c.id
  LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
  INNER JOIN units u ON i.unit_id = u.id
`;

export const getItemReportItemsModel = async ({
  item_type_id,
  category_id,
  sub_category_id,
  search,
}) => {
  const conditions = ["i.status = 'active'"];
  const params = [];

  if (item_type_id) {
    conditions.push("i.item_type_id = ?");
    params.push(item_type_id);
  }

  if (category_id) {
    conditions.push("i.category_id = ?");
    params.push(category_id);
  }

  if (sub_category_id) {
    conditions.push("i.sub_category_id = ?");
    params.push(sub_category_id);
  }

  if (search) {
    conditions.push("(i.item_code LIKE ? OR i.item_name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `
    ${itemReportSelectClause}
    ${whereClause}
    ORDER BY i.id DESC
    `,
    params
  );

  return rows.map((row) => ({
    ...row,
    boxes: row.unit_qty > 0 ? parseFloat((row.stock / row.unit_qty).toFixed(2)) : 0,
  }));
};

export const getItemReportItemByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    ${itemReportSelectClause}
    WHERE i.status = 'active' AND i.id = ?
    LIMIT 1
    `,
    [id]
  );

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    ...row,
    boxes: row.unit_qty > 0 ? parseFloat((row.stock / row.unit_qty).toFixed(2)) : 0,
  };
};

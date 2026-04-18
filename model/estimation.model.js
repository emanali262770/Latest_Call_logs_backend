import { db } from "../config/db.js";

export const getNextEstimateIdModel = async () => {
  const [rows] = await db.execute(
    `SELECT estimate_id FROM estimations ORDER BY id DESC LIMIT 1`
  );

  if (!rows.length) {
    return "EST-0001";
  }

  const last = rows[0].estimate_id;
  const match = last.match(/^EST-(\d+)$/i);
  if (!match) {
    return "EST-0001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `EST-${String(nextNum).padStart(4, "0")}`;
};

const estimationSelectClause = `
  SELECT
    e.id,
    e.estimate_id          AS estimateId,
    e.estimate_date        AS estimateDate,
    e.customer_id          AS customerId,
    c.company              AS customerCompany,
    e.person,
    e.designation,
    e.service_id           AS serviceId,
    s.service_name         AS service,
    e.created_by           AS createdById,
    u.username             AS createdBy,
    e.grand_purchase_total AS purchaseTotal,
    e.grand_sale_total     AS saleTotal,
    e.grand_discount_total AS discountTotal,
    e.grand_final_total    AS finalTotal,
    e.status,
    e.created_at           AS createdAt,
    e.updated_at           AS updatedAt
  FROM estimations e
  LEFT JOIN customers c ON e.customer_id = c.id
  LEFT JOIN services s  ON e.service_id = s.id
  LEFT JOIN users u     ON e.created_by = u.id
`;

export const createEstimationHeaderModel = async (connection, fields) => {
  const {
    estimate_id,
    estimate_date,
    customer_id,
    person,
    designation,
    service_id,
    created_by,
    grand_purchase_total,
    grand_sale_total,
    grand_discount_total,
    grand_final_total,
    status,
  } = fields;

  const [result] = await connection.execute(
    `INSERT INTO estimations (
      estimate_id, estimate_date, customer_id, person, designation,
      service_id, created_by, grand_purchase_total, grand_sale_total,
      grand_discount_total, grand_final_total, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      estimate_id,
      estimate_date,
      customer_id ?? null,
      person ?? null,
      designation ?? null,
      service_id ?? null,
      created_by ?? null,
      grand_purchase_total ?? 0,
      grand_sale_total ?? 0,
      grand_discount_total ?? 0,
      grand_final_total ?? 0,
      status ?? "active",
    ]
  );

  return result;
};

export const updateEstimationHeaderModel = async (connection, id, fields) => {
  const {
    estimate_date,
    customer_id,
    person,
    designation,
    service_id,
    grand_purchase_total,
    grand_sale_total,
    grand_discount_total,
    grand_final_total,
    status,
  } = fields;

  const [result] = await connection.execute(
    `UPDATE estimations SET
      estimate_date = ?,
      customer_id = ?,
      person = ?,
      designation = ?,
      service_id = ?,
      grand_purchase_total = ?,
      grand_sale_total = ?,
      grand_discount_total = ?,
      grand_final_total = ?,
      status = ?
    WHERE id = ?`,
    [
      estimate_date,
      customer_id ?? null,
      person ?? null,
      designation ?? null,
      service_id ?? null,
      grand_purchase_total ?? 0,
      grand_sale_total ?? 0,
      grand_discount_total ?? 0,
      grand_final_total ?? 0,
      status ?? "active",
      id,
    ]
  );

  return result;
};

export const createEstimationItemsModel = async (connection, estimationId, items) => {
  if (!items.length) return;

  const placeholders = items
    .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .join(", ");
  const values = items.flatMap((item) => [
    estimationId,
    item.item_rate_id ?? null,
    item.item_name ?? null,
    item.qty,
    item.description ?? null,
    item.purchase_price,
    item.purchase_total,
    item.sale_price,
    item.sale_total,
    item.sale_price_with_tax,
    item.sale_total_with_tax,
    item.discount_percent,
    item.discount_amount,
    item.final_price,
    item.final_total,
  ]);

  await connection.execute(
    `INSERT INTO estimation_items (
      estimation_id, item_rate_id, item_name, qty, description,
      purchase_price, purchase_total, sale_price, sale_total,
      sale_price_with_tax, sale_total_with_tax, discount_percent,
      discount_amount, final_price, final_total
    ) VALUES ${placeholders}`,
    values
  );
};

export const deleteEstimationItemsModel = async (connection, estimationId) => {
  await connection.execute(`DELETE FROM estimation_items WHERE estimation_id = ?`, [
    estimationId,
  ]);
};

export const getEstimationItemsByEstimationIdModel = async (estimationId) => {
  const [rows] = await db.execute(
    `
    SELECT
      ei.id,
      ei.estimation_id      AS estimationId,
      ei.item_rate_id       AS itemRateId,
      ei.item_name          AS itemName,
      ei.qty,
      ei.description,
      ei.purchase_price     AS purchasePrice,
      ei.purchase_total     AS purchaseTotal,
      ei.sale_price         AS salePrice,
      ei.sale_total         AS saleTotal,
      ei.sale_price_with_tax AS salePriceWithTax,
      ei.sale_total_with_tax AS saleTotalWithTax,
      ei.discount_percent   AS discountPercent,
      ei.discount_amount    AS discountAmount,
      ei.final_price        AS finalPrice,
      ei.final_total        AS finalTotal,
      ei.created_at         AS createdAt,
      ei.updated_at         AS updatedAt
    FROM estimation_items ei
    WHERE ei.estimation_id = ?
    ORDER BY ei.id ASC
    `,
    [estimationId]
  );

  return rows;
};

export const getEstimationsModel = async ({ search, status, customer_id }) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`
      (
        e.estimate_id LIKE ?
        OR c.company LIKE ?
        OR EXISTS (
          SELECT 1
          FROM estimation_items ei
          WHERE ei.estimation_id = e.id
            AND ei.item_name LIKE ?
        )
      )
    `);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push("e.status = ?");
    params.push(status);
  }

  if (customer_id) {
    conditions.push("e.customer_id = ?");
    params.push(customer_id);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `${estimationSelectClause} ${whereClause} ORDER BY e.id DESC`,
    params
  );

  return rows;
};

export const getEstimationByIdModel = async (id) => {
  const [rows] = await db.execute(
    `${estimationSelectClause} WHERE e.id = ? LIMIT 1`,
    [id]
  );

  return rows[0];
};

export const deleteEstimationModel = async (connection, id) => {
  const [result] = await connection.execute(`DELETE FROM estimations WHERE id = ?`, [id]);
  return result;
};

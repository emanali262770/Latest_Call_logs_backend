import { db } from "../config/db.js";

// ─── Auto-generate next estimate ID (EST-0001, EST-0002, …) ─────────────────
export const getNextEstimateIdModel = async () => {
  const [rows] = await db.execute(
    `SELECT estimate_id FROM estimations ORDER BY id DESC LIMIT 1`
  );

  if (!rows.length) {
    return "EST-0001";
  }

  const last = rows[0].estimate_id; // e.g. "EST-0042"
  const match = last.match(/^EST-(\d+)$/i);
  if (!match) {
    return "EST-0001";
  }

  const nextNum = parseInt(match[1], 10) + 1;
  return `EST-${String(nextNum).padStart(4, "0")}`;
};

// ─── SELECT clause (used in GET queries) ────────────────────────────────────
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
    e.item_rate_id         AS itemRateId,
    e.item_name            AS itemName,
    e.qty,
    e.description,
    e.purchase_price       AS purchasePrice,
    e.purchase_total       AS purchaseTotal,
    e.sale_price           AS salePrice,
    e.sale_total           AS saleTotal,
    e.sale_price_with_tax  AS salePriceWithTax,
    e.sale_total_with_tax  AS saleTotalWithTax,
    e.discount_percent     AS discountPercent,
    e.discount_amount      AS discountAmount,
    e.final_price          AS finalPrice,
    e.final_total          AS finalTotal,
    e.status,
    e.created_at           AS createdAt,
    e.updated_at           AS updatedAt
  FROM estimations e
  LEFT JOIN customers c  ON e.customer_id = c.id
  LEFT JOIN services  s  ON e.service_id  = s.id
  LEFT JOIN users     u  ON e.created_by  = u.id
`;

// ─── CREATE ─────────────────────────────────────────────────────────────────
export const createEstimationModel = async ({
  estimate_id,
  estimate_date,
  customer_id,
  person,
  designation,
  service_id,
  created_by,
  item_rate_id,
  item_name,
  qty,
  description,
  purchase_price,
  purchase_total,
  sale_price,
  sale_total,
  sale_price_with_tax,
  sale_total_with_tax,
  discount_percent,
  discount_amount,
  final_price,
  final_total,
  status,
}) => {
  const [result] = await db.execute(
    `INSERT INTO estimations (
      estimate_id, estimate_date, customer_id, person, designation,
      service_id, created_by, item_rate_id, item_name, qty, description,
      purchase_price, purchase_total, sale_price, sale_total,
      sale_price_with_tax, sale_total_with_tax,
      discount_percent, discount_amount, final_price, final_total, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      estimate_id,
      estimate_date,
      customer_id ?? null,
      person ?? null,
      designation ?? null,
      service_id ?? null,
      created_by ?? null,
      item_rate_id ?? null,
      item_name ?? null,
      qty,
      description ?? null,
      purchase_price,
      purchase_total,
      sale_price,
      sale_total,
      sale_price_with_tax,
      sale_total_with_tax,
      discount_percent,
      discount_amount,
      final_price,
      final_total,
      status ?? "active",
    ]
  );
  return result;
};

// ─── GET ALL ─────────────────────────────────────────────────────────────────
export const getEstimationsModel = async ({ search, status, customer_id }) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(
      "(e.estimate_id LIKE ? OR c.company LIKE ? OR e.item_name LIKE ?)"
    );
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

// ─── GET BY ID ───────────────────────────────────────────────────────────────
export const getEstimationByIdModel = async (id) => {
  const [rows] = await db.execute(
    `${estimationSelectClause} WHERE e.id = ? LIMIT 1`,
    [id]
  );
  return rows[0];
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
export const updateEstimationModel = async (id, fields) => {
  const {
    estimate_date,
    customer_id,
    person,
    designation,
    service_id,
    item_rate_id,
    item_name,
    qty,
    description,
    purchase_price,
    purchase_total,
    sale_price,
    sale_total,
    sale_price_with_tax,
    sale_total_with_tax,
    discount_percent,
    discount_amount,
    final_price,
    final_total,
    status,
  } = fields;

  const [result] = await db.execute(
    `UPDATE estimations SET
      estimate_date       = ?,
      customer_id         = ?,
      person              = ?,
      designation         = ?,
      service_id          = ?,
      item_rate_id        = ?,
      item_name           = ?,
      qty                 = ?,
      description         = ?,
      purchase_price      = ?,
      purchase_total      = ?,
      sale_price          = ?,
      sale_total          = ?,
      sale_price_with_tax = ?,
      sale_total_with_tax = ?,
      discount_percent    = ?,
      discount_amount     = ?,
      final_price         = ?,
      final_total         = ?,
      status              = ?
    WHERE id = ?`,
    [
      estimate_date,
      customer_id ?? null,
      person ?? null,
      designation ?? null,
      service_id ?? null,
      item_rate_id ?? null,
      item_name ?? null,
      qty,
      description ?? null,
      purchase_price,
      purchase_total,
      sale_price,
      sale_total,
      sale_price_with_tax,
      sale_total_with_tax,
      discount_percent,
      discount_amount,
      final_price,
      final_total,
      status ?? "active",
      id,
    ]
  );
  return result;
};

// ─── DELETE ──────────────────────────────────────────────────────────────────
export const deleteEstimationModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM estimations WHERE id = ?`, [id]);
  return result;
};

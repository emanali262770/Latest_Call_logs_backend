import { db } from "../config/db.js";

const quotationSelectClause = `
  SELECT
    q.id,
    q.quotation_no        AS quotationNo,
    q.quotation_date      AS quotationDate,
    q.revision_id         AS revisionId,
    q.base_revision_id    AS baseRevisionId,
    q.revision_no         AS revisionNo,
    q.parent_quotation_id AS parentQuotationId,
    q.is_revision         AS isRevision,
    q.customer_id         AS customerId,
    q.customer_name       AS customerName,
    c.email               AS customerEmail,
    c.whatsapp_no         AS customerWhatsappNo,
    q.person,
    q.designation,
    q.department,
    q.estimation_id       AS estimationId,
    q.service_id          AS serviceId,
    q.service_name        AS serviceName,
    q.letter_type         AS letterType,
    q.tax_mode            AS taxMode,
    q.created_by          AS createdById,
    u.username            AS createdBy,
    q.total_qty           AS totalQty,
    q.sub_total           AS subTotal,
    q.gst_total           AS gstTotal,
    q.grand_total         AS grandTotal,
    q.status,
    q.created_at          AS createdAt,
    q.updated_at          AS updatedAt
  FROM quotations q
  LEFT JOIN customers c ON q.customer_id = c.id
  LEFT JOIN users u ON q.created_by = u.id
`;

export const getNextQuotationNoModel = async (letterCode) => {
  const prefix = `AIT/${letterCode}/`;
  const [rows] = await db.execute(
    `
    SELECT quotation_no
    FROM quotations
    WHERE quotation_no LIKE ?
    ORDER BY CAST(SUBSTRING_INDEX(quotation_no, '/', -1) AS UNSIGNED) DESC
    LIMIT 1
    `,
    [`${prefix}%`]
  );

  if (!rows.length) {
    return `${prefix}0001`;
  }

  const lastNumber = Number(rows[0].quotation_no.split("/").pop());
  const nextNumber = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
  return `${prefix}${String(nextNumber).padStart(4, "0")}`;
};

export const getNextBaseRevisionIdModel = async () => {
  const [rows] = await db.execute(
    `
    SELECT base_revision_id
    FROM quotations
    WHERE revision_no = 0
    ORDER BY CAST(base_revision_id AS UNSIGNED) DESC
    LIMIT 1
    `
  );

  if (!rows.length) {
    return "0001";
  }

  const nextNumber = Number(rows[0].base_revision_id) + 1;
  return String(nextNumber).padStart(4, "0");
};

export const getNextRevisionNumberModel = async (baseRevisionId) => {
  const [rows] = await db.execute(
    `
    SELECT MAX(revision_no) AS maxRevisionNo
    FROM quotations
    WHERE base_revision_id = ?
    `,
    [baseRevisionId]
  );

  return Number(rows[0]?.maxRevisionNo ?? 0) + 1;
};

export const createQuotationHeaderModel = async (connection, fields) => {
  const {
    quotation_no,
    quotation_date,
    revision_id,
    base_revision_id,
    revision_no,
    parent_quotation_id,
    is_revision,
    customer_id,
    customer_name,
    person,
    designation,
    department,
    estimation_id,
    service_id,
    service_name,
    letter_type,
    tax_mode,
    created_by,
    total_qty,
    sub_total,
    gst_total,
    grand_total,
    status,
  } = fields;

  const [result] = await connection.execute(
    `
    INSERT INTO quotations (
      quotation_no, quotation_date, revision_id, base_revision_id, revision_no,
      parent_quotation_id, is_revision, customer_id, customer_name, person,
      designation, department, estimation_id, service_id, service_name,
      letter_type, tax_mode, created_by, total_qty, sub_total, gst_total,
      grand_total, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      quotation_no,
      quotation_date,
      revision_id,
      base_revision_id,
      revision_no ?? 0,
      parent_quotation_id ?? null,
      is_revision ? 1 : 0,
      customer_id,
      customer_name ?? null,
      person ?? null,
      designation ?? null,
      department ?? null,
      estimation_id ?? null,
      service_id ?? null,
      service_name ?? null,
      letter_type,
      tax_mode,
      created_by ?? null,
      total_qty ?? 0,
      sub_total ?? 0,
      gst_total ?? 0,
      grand_total ?? 0,
      status ?? "active",
    ]
  );

  return result;
};

export const updateQuotationHeaderModel = async (connection, id, fields) => {
  const {
    quotation_no,
    quotation_date,
    customer_id,
    customer_name,
    person,
    designation,
    department,
    estimation_id,
    service_id,
    service_name,
    letter_type,
    tax_mode,
    total_qty,
    sub_total,
    gst_total,
    grand_total,
    status,
  } = fields;

  const [result] = await connection.execute(
    `
    UPDATE quotations SET
      quotation_no = ?,
      quotation_date = ?,
      customer_id = ?,
      customer_name = ?,
      person = ?,
      designation = ?,
      department = ?,
      estimation_id = ?,
      service_id = ?,
      service_name = ?,
      letter_type = ?,
      tax_mode = ?,
      total_qty = ?,
      sub_total = ?,
      gst_total = ?,
      grand_total = ?,
      status = ?
    WHERE id = ?
    `,
    [
      quotation_no,
      quotation_date,
      customer_id,
      customer_name ?? null,
      person ?? null,
      designation ?? null,
      department ?? null,
      estimation_id ?? null,
      service_id ?? null,
      service_name ?? null,
      letter_type,
      tax_mode,
      total_qty ?? 0,
      sub_total ?? 0,
      gst_total ?? 0,
      grand_total ?? 0,
      status ?? "active",
      id,
    ]
  );

  return result;
};

export const createQuotationItemsModel = async (connection, quotationId, items) => {
  if (!items.length) return;

  const placeholders = items
    .map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .join(", ");
  const values = items.flatMap((item) => [
    quotationId,
    item.item_rate_id ?? null,
    item.item_name ?? null,
    item.rate,
    item.qty,
    item.description ?? null,
    item.total,
    item.gst_percent,
    item.gst_amount,
    item.rate_with_gst,
    item.total_with_gst,
  ]);

  await connection.execute(
    `
    INSERT INTO quotation_items (
      quotation_id, item_rate_id, item_name, rate, qty, description,
      total, gst_percent, gst_amount, rate_with_gst, total_with_gst
    ) VALUES ${placeholders}
    `,
    values
  );
};

export const deleteQuotationItemsModel = async (connection, quotationId) => {
  await connection.execute(`DELETE FROM quotation_items WHERE quotation_id = ?`, [
    quotationId,
  ]);
};

export const getQuotationItemsByQuotationIdModel = async (quotationId) => {
  const [rows] = await db.execute(
    `
    SELECT
      id,
      quotation_id    AS quotationId,
      item_rate_id    AS itemRateId,
      item_name       AS itemName,
      rate,
      qty,
      description,
      total,
      gst_percent     AS gstPercent,
      gst_amount      AS gstAmount,
      rate_with_gst   AS rateWithGst,
      total_with_gst  AS totalWithGst,
      created_at      AS createdAt,
      updated_at      AS updatedAt
    FROM quotation_items
    WHERE quotation_id = ?
    ORDER BY id ASC
    `,
    [quotationId]
  );

  return rows;
};

export const getQuotationsModel = async ({ search, status, customer_id }) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`
      (
        q.quotation_no LIKE ?
        OR q.revision_id LIKE ?
        OR q.customer_name LIKE ?
        OR q.person LIKE ?
        OR q.service_name LIKE ?
      )
    `);
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  if (status) {
    conditions.push("q.status = ?");
    params.push(status);
  }

  if (customer_id) {
    conditions.push("q.customer_id = ?");
    params.push(customer_id);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.execute(
    `${quotationSelectClause} ${whereClause} ORDER BY q.id DESC`,
    params
  );

  return rows;
};

export const getQuotationByIdModel = async (id) => {
  const [rows] = await db.execute(
    `${quotationSelectClause} WHERE q.id = ? LIMIT 1`,
    [id]
  );

  return rows[0];
};

export const getQuotationByRevisionIdModel = async (revisionId) => {
  const [rows] = await db.execute(
    `${quotationSelectClause} WHERE q.revision_id = ? LIMIT 1`,
    [revisionId]
  );

  return rows[0];
};

export const deleteQuotationModel = async (connection, id) => {
  const [result] = await connection.execute(`DELETE FROM quotations WHERE id = ?`, [id]);
  return result;
};

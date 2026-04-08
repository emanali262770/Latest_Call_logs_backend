import { db } from "../config/db.js";

let lowStockNotificationReadsTablePromise;

const ensureLowStockNotificationReadsTableModel = async () => {
  if (!lowStockNotificationReadsTablePromise) {
    lowStockNotificationReadsTablePromise = db.execute(`
      CREATE TABLE IF NOT EXISTS item_definition_notification_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        item_definition_id INT NOT NULL,
        item_updated_at TIMESTAMP NOT NULL,
        read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_item_state (user_id, item_definition_id, item_updated_at),
        KEY idx_item_definition_notification_reads_user_id (user_id),
        KEY idx_item_definition_notification_reads_item_definition_id (item_definition_id),
        CONSTRAINT fk_item_definition_notification_reads_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_item_definition_notification_reads_item_definition
          FOREIGN KEY (item_definition_id) REFERENCES item_definitions(id) ON DELETE CASCADE
      )
    `);
  }

  await lowStockNotificationReadsTablePromise;
};

const itemDefinitionSelectClause = `
  SELECT
    i.*,
    it.item_type_name,
    c.category_name,
    sc.sub_category_name,
    m.manufacturer_name,
    s.supplier_name,
    u.unit_name,
    u.short_name AS unit_short_name,
    l.location_name
  FROM item_definitions i
  INNER JOIN item_types it ON i.item_type_id = it.id
  INNER JOIN categories c ON i.category_id = c.id
  LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
  LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
  LEFT JOIN suppliers s ON i.supplier_id = s.id
  INNER JOIN units u ON i.unit_id = u.id
  LEFT JOIN locations l ON i.location_id = l.id
`;

export const generateItemCodeModel = async () => {
  const [rows] = await db.execute(`
    SELECT id
    FROM item_definitions
    ORDER BY id DESC
    LIMIT 1
  `);

  const nextNumber = (rows[0]?.id || 0) + 1;
  return `item-${String(nextNumber).padStart(4, "0")}`;
};

export const createItemDefinitionModel = async ({
  item_code,
  primary_barcode,
  secondary_barcode,
  item_type_id,
  category_id,
  sub_category_id,
  manufacturer_id,
  supplier_id,
  item_name,
  unit_id,
  unit_qty,
  reorder_level,
  location_id,
  purchase_price,
  sale_price,
  is_expirable,
  expiry_days,
  is_cost_item,
  stop_sale,
  image,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO item_definitions
    (
      item_code,
      primary_barcode,
      secondary_barcode,
      item_type_id,
      category_id,
      sub_category_id,
      manufacturer_id,
      supplier_id,
      item_name,
      unit_id,
      unit_qty,
      reorder_level,
      location_id,
      purchase_price,
      sale_price,
      is_expirable,
      expiry_days,
      is_cost_item,
      stop_sale,
      image,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      item_code,
      primary_barcode,
      secondary_barcode,
      item_type_id,
      category_id,
      sub_category_id,
      manufacturer_id,
      supplier_id,
      item_name,
      unit_id,
      unit_qty,
      reorder_level,
      location_id,
      purchase_price,
      sale_price,
      is_expirable,
      expiry_days,
      is_cost_item,
      stop_sale,
      image,
      status || "active",
    ]
  );

  return result;
};

export const getItemDefinitionsModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`
      (
        i.item_code LIKE ?
        OR i.item_name LIKE ?
        OR COALESCE(i.primary_barcode, '') LIKE ?
        OR COALESCE(i.secondary_barcode, '') LIKE ?
      )
    `);
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    conditions.push("i.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `
    ${itemDefinitionSelectClause}
    ${whereClause}
    ORDER BY i.id DESC
    `,
    params
  );

  return rows;
};

export const getItemDefinitionByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    ${itemDefinitionSelectClause}
    WHERE i.id = ?
    `,
    [id]
  );

  return rows[0];
};

export const getItemDefinitionByItemCodeModel = async (itemCode) => {
  const [rows] = await db.execute(
    `
    SELECT *
    FROM item_definitions
    WHERE LOWER(TRIM(item_code)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [itemCode]
  );

  return rows[0];
};

export const getItemDefinitionByBarcodeModel = async (barcode) => {
  const [rows] = await db.execute(
    `
    SELECT
      i.id,
      i.item_code,
      i.primary_barcode,
      i.secondary_barcode,
      i.item_name,
      i.unit_qty,
      i.reorder_level,
      i.purchase_price,
      i.sale_price,
      i.is_expirable,
      i.expiry_days,
      i.is_cost_item,
      i.stop_sale,
      i.image,
      i.status,
      i.created_at,
      i.updated_at,
      it.item_type_name,
      c.category_name,
      sc.sub_category_name,
      m.manufacturer_name,
      s.supplier_name,
      u.unit_name,
      u.short_name AS unit_short_name,
      l.location_name
    FROM item_definitions i
    INNER JOIN item_types it ON i.item_type_id = it.id
    INNER JOIN categories c ON i.category_id = c.id
    LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
    LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    INNER JOIN units u ON i.unit_id = u.id
    LEFT JOIN locations l ON i.location_id = l.id
    WHERE LOWER(TRIM(COALESCE(i.primary_barcode, ''))) = LOWER(TRIM(?))
       OR LOWER(TRIM(COALESCE(i.secondary_barcode, ''))) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [barcode, barcode]
  );

  return rows[0];
};

export const getLowStockItemDefinitionsModel = async (userId) => {
  await ensureLowStockNotificationReadsTableModel();

  const [rows] = await db.execute(
    `
    ${itemDefinitionSelectClause}
    LEFT JOIN item_definition_notification_reads idnr
      ON idnr.item_definition_id = i.id
      AND idnr.user_id = ?
      AND idnr.item_updated_at = i.updated_at
    WHERE i.status = 'active'
      AND i.unit_qty < i.reorder_level
      AND idnr.id IS NULL
    ORDER BY i.updated_at DESC, i.id DESC
    `,
    [userId]
  );

  return rows;
};

export const getLowStockItemDefinitionsCountModel = async (userId) => {
  await ensureLowStockNotificationReadsTableModel();

  const [rows] = await db.execute(
    `
    SELECT COUNT(*) AS total
    FROM item_definitions i
    LEFT JOIN item_definition_notification_reads idnr
      ON idnr.item_definition_id = i.id
      AND idnr.user_id = ?
      AND idnr.item_updated_at = i.updated_at
    WHERE i.status = 'active'
      AND i.unit_qty < i.reorder_level
      AND idnr.id IS NULL
    `,
    [userId]
  );

  return rows[0]?.total || 0;
};

export const markLowStockItemDefinitionAsReadModel = async (itemDefinitionId, userId) => {
  await ensureLowStockNotificationReadsTableModel();

  const [rows] = await db.execute(
    `
    SELECT id, updated_at
    FROM item_definitions
    WHERE id = ?
      AND status = 'active'
      AND unit_qty < reorder_level
    LIMIT 1
    `,
    [itemDefinitionId]
  );

  const itemDefinition = rows[0];

  if (!itemDefinition) {
    return null;
  }

  await db.execute(
    `
    INSERT INTO item_definition_notification_reads
    (user_id, item_definition_id, item_updated_at)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE read_at = CURRENT_TIMESTAMP
    `,
    [userId, itemDefinition.id, itemDefinition.updated_at]
  );

  return itemDefinition;
};

export const updateItemDefinitionModel = async ({
  id,
  item_code,
  primary_barcode,
  secondary_barcode,
  item_type_id,
  category_id,
  sub_category_id,
  manufacturer_id,
  supplier_id,
  item_name,
  unit_id,
  unit_qty,
  reorder_level,
  location_id,
  purchase_price,
  sale_price,
  is_expirable,
  expiry_days,
  is_cost_item,
  stop_sale,
  image,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE item_definitions
    SET
      item_code = ?,
      primary_barcode = ?,
      secondary_barcode = ?,
      item_type_id = ?,
      category_id = ?,
      sub_category_id = ?,
      manufacturer_id = ?,
      supplier_id = ?,
      item_name = ?,
      unit_id = ?,
      unit_qty = ?,
      reorder_level = ?,
      location_id = ?,
      purchase_price = ?,
      sale_price = ?,
      is_expirable = ?,
      expiry_days = ?,
      is_cost_item = ?,
      stop_sale = ?,
      image = ?,
      status = ?
    WHERE id = ?
    `,
    [
      item_code,
      primary_barcode,
      secondary_barcode,
      item_type_id,
      category_id,
      sub_category_id,
      manufacturer_id,
      supplier_id,
      item_name,
      unit_id,
      unit_qty,
      reorder_level,
      location_id,
      purchase_price,
      sale_price,
      is_expirable,
      expiry_days,
      is_cost_item,
      stop_sale,
      image,
      status,
      id,
    ]
  );

  return result;
};

export const deleteItemDefinitionModel = async (id) => {
  const [result] = await db.execute(`DELETE FROM item_definitions WHERE id = ?`, [id]);
  return result;
};

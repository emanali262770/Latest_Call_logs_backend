import { db } from "../config/db.js";

const nullIfUndefined = (value) => (value === undefined ? null : value);

const itemRateSelectClause = `
  SELECT
    ir.*,
    ir.rate_date AS rateDate,
    ir.quotation_id AS quotationId,
    ir.supplier_id AS supplierId,
    ir.category_id AS categoryId,
    ir.sub_category_id AS subCategoryId,
    ir.manufacturer_id AS manufacturerId,
    ir.item_definition_id AS itemDefinitionId,
    ir.item_specification AS itemSpecification,
    ir.item_specification AS specification,
    ir.reseller_price_usd AS resellerPriceUsd,
    ir.exchange_rate AS exchangeRate,
    ir.reseller_price AS resellerPrice,
    ir.sale_price AS salePrice,
    ir.sales_tax_percent AS salesTaxPercent,
    ir.sales_tax_amount AS salesTaxAmount,
    ir.i_tax_percent AS iTaxPercent,
    ir.i_tax_amount AS iTaxAmount,
    ir.other_tax_percent AS otherTaxPercent,
    ir.other_tax_amount AS otherTaxAmount,
    ir.profit_percent AS profitPercent,
    ir.profit_amount AS profitAmount,
    ir.sale_price_with_tax AS salePriceWithTax,
    s.supplier_code,
    s.supplier_name,
    s.supplier_name AS supplierName,
    s.supplier_name AS supplier,
    c.category_name,
    c.category_name AS categoryName,
    c.category_name AS category,
    sc.sub_category_name,
    sc.sub_category_name AS subCategoryName,
    sc.sub_category_name AS subCategory,
    m.manufacturer_name,
    m.manufacturer_name AS manufacturerName,
    m.manufacturer_name AS manufacturer,
    i.item_code,
    i.item_code AS itemCode,
    i.item_name,
    i.item_name AS itemName,
    i.item_name AS item
  FROM item_rates ir
  INNER JOIN suppliers s ON ir.supplier_id = s.id
  INNER JOIN categories c ON ir.category_id = c.id
  LEFT JOIN sub_categories sc ON ir.sub_category_id = sc.id
  LEFT JOIN manufacturers m ON ir.manufacturer_id = m.id
  INNER JOIN item_definitions i ON ir.item_definition_id = i.id
`;

export const createItemRateModel = async ({
  rate_date,
  supplier_id,
  quotation_id,
  category_id,
  sub_category_id,
  manufacturer_id,
  item_definition_id,
  item_specification,
  currency,
  exchange_rate,
  reseller_price_usd,
  reseller_price,
  sale_price,
  sales_tax_percent,
  sales_tax_amount,
  i_tax_percent,
  i_tax_amount,
  other_tax_percent,
  other_tax_amount,
  profit_percent,
  profit_amount,
  sale_price_with_tax,
  status,
}) => {
  const [result] = await db.execute(
    `
    INSERT INTO item_rates (
      rate_date,
      supplier_id,
      quotation_id,
      category_id,
      sub_category_id,
      manufacturer_id,
      item_definition_id,
      item_specification,
      currency,
      exchange_rate,
      reseller_price_usd,
      reseller_price,
      sale_price,
      sales_tax_percent,
      sales_tax_amount,
      i_tax_percent,
      i_tax_amount,
      other_tax_percent,
      other_tax_amount,
      profit_percent,
      profit_amount,
      sale_price_with_tax,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      rate_date,
      supplier_id,
      nullIfUndefined(quotation_id),
      category_id,
      nullIfUndefined(sub_category_id),
      nullIfUndefined(manufacturer_id),
      item_definition_id,
      nullIfUndefined(item_specification),
      currency,
      exchange_rate,
      reseller_price_usd,
      reseller_price,
      sale_price,
      sales_tax_percent,
      sales_tax_amount,
      i_tax_percent,
      i_tax_amount,
      other_tax_percent,
      other_tax_amount,
      profit_percent,
      profit_amount,
      sale_price_with_tax,
      status || "active",
    ]
  );

  return result;
};

export const getItemRatesModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push(`
      (
        COALESCE(ir.quotation_id, '') LIKE ?
        OR s.supplier_name LIKE ?
        OR i.item_name LIKE ?
        OR i.item_code LIKE ?
      )
    `);
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue);
  }

  if (status) {
    conditions.push("ir.status = ?");
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await db.execute(
    `
    ${itemRateSelectClause}
    ${whereClause}
    ORDER BY ir.id DESC
    `,
    params
  );

  return rows;
};

export const getItemRateByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    ${itemRateSelectClause}
    WHERE ir.id = ?
    `,
    [id]
  );

  return rows[0];
};

export const getDuplicateItemRateModel = async ({
  item_definition_id,
  supplier_id,
  quotation_id,
  rate_date,
}) => {
  const [rows] = await db.execute(
    `
    SELECT id, item_definition_id, supplier_id, quotation_id, rate_date
    FROM item_rates
    WHERE item_definition_id = ?
      AND supplier_id = ?
      AND rate_date = ?
      AND (
        (? IS NULL AND quotation_id IS NULL)
        OR quotation_id = ?
      )
    LIMIT 1
    `,
    [item_definition_id, supplier_id, rate_date, quotation_id, quotation_id]
  );

  return rows[0];
};

export const getLatestQuotationIdBySupplierModel = async (supplierId) => {
  const [rows] = await db.execute(
    `
    SELECT quotation_id
    FROM item_rates
    WHERE supplier_id = ?
      AND quotation_id IS NOT NULL
      AND quotation_id <> ''
    ORDER BY id DESC
    LIMIT 1
    `,
    [supplierId]
  );

  return rows[0]?.quotation_id || null;
};

export const updateItemRateModel = async ({
  id,
  rate_date,
  supplier_id,
  quotation_id,
  category_id,
  sub_category_id,
  manufacturer_id,
  item_definition_id,
  item_specification,
  currency,
  exchange_rate,
  reseller_price_usd,
  reseller_price,
  sale_price,
  sales_tax_percent,
  sales_tax_amount,
  i_tax_percent,
  i_tax_amount,
  other_tax_percent,
  other_tax_amount,
  profit_percent,
  profit_amount,
  sale_price_with_tax,
  status,
}) => {
  const [result] = await db.execute(
    `
    UPDATE item_rates
    SET
      rate_date = ?,
      supplier_id = ?,
      quotation_id = ?,
      category_id = ?,
      sub_category_id = ?,
      manufacturer_id = ?,
      item_definition_id = ?,
      item_specification = ?,
      currency = ?,
      exchange_rate = ?,
      reseller_price_usd = ?,
      reseller_price = ?,
      sale_price = ?,
      sales_tax_percent = ?,
      sales_tax_amount = ?,
      i_tax_percent = ?,
      i_tax_amount = ?,
      other_tax_percent = ?,
      other_tax_amount = ?,
      profit_percent = ?,
      profit_amount = ?,
      sale_price_with_tax = ?,
      status = ?
    WHERE id = ?
    `,
    [
      rate_date,
      supplier_id,
      nullIfUndefined(quotation_id),
      category_id,
      nullIfUndefined(sub_category_id),
      nullIfUndefined(manufacturer_id),
      item_definition_id,
      nullIfUndefined(item_specification),
      currency,
      exchange_rate,
      reseller_price_usd,
      reseller_price,
      sale_price,
      sales_tax_percent,
      sales_tax_amount,
      i_tax_percent,
      i_tax_amount,
      other_tax_percent,
      other_tax_amount,
      profit_percent,
      profit_amount,
      sale_price_with_tax,
      status,
      id,
    ]
  );

  return result;
};

export const deleteItemRateModel = async (id) => {
  const [result] = await db.execute("DELETE FROM item_rates WHERE id = ?", [id]);
  return result;
};

export const getActiveItemRateLookupsModel = async () => {
  const [suppliers] = await db.execute(`
    SELECT id, supplier_code, supplier_name, contact_person, city
    FROM suppliers
    WHERE status = 'active'
    ORDER BY supplier_name ASC
  `);
  const [categories] = await db.execute(`
    SELECT id, category_name
    FROM categories
    WHERE status = 'active'
    ORDER BY category_name ASC
  `);
  const [subCategories] = await db.execute(`
    SELECT sc.id, sc.category_id, sc.sub_category_name, c.category_name
    FROM sub_categories sc
    INNER JOIN categories c ON sc.category_id = c.id
    WHERE sc.status = 'active'
      AND c.status = 'active'
    ORDER BY sc.sub_category_name ASC
  `);
  const [manufacturers] = await db.execute(`
    SELECT id, manufacturer_name
    FROM manufacturers
    WHERE status = 'active'
    ORDER BY manufacturer_name ASC
  `);
  const [items] = await db.execute(`
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.category_id,
      i.sub_category_id,
      i.manufacturer_id,
      i.supplier_id,
      i.item_specification,
      i.item_specification AS itemSpecification,
      i.item_specification AS specification,
      i.sale_price
    FROM item_definitions i
    WHERE i.status = 'active'
    ORDER BY i.item_name ASC
  `);

  return { suppliers, categories, subCategories, manufacturers, items };
};

export const getActiveItemRateItemDetailsModel = async (itemId) => {
  const [rows] = await db.execute(
    `
    SELECT
      i.id,
      i.item_code,
      i.item_name,
      i.category_id,
      c.category_name,
      c.category_name AS categoryName,
      i.sub_category_id,
      sc.sub_category_name,
      sc.sub_category_name AS subCategoryName,
      i.manufacturer_id,
      m.manufacturer_name,
      m.manufacturer_name AS manufacturerName,
      i.supplier_id,
      i.supplier_id AS itemSupplierId,
      s.supplier_code AS itemSupplierCode,
      s.supplier_name AS itemSupplierName,
      s.supplier_name AS defaultSupplierName,
      i.item_specification,
      i.item_specification AS itemSpecification,
      i.item_specification AS specification,
      i.sale_price
    FROM item_definitions i
    INNER JOIN categories c ON i.category_id = c.id
    LEFT JOIN sub_categories sc ON i.sub_category_id = sc.id
    LEFT JOIN manufacturers m ON i.manufacturer_id = m.id
    LEFT JOIN suppliers s ON i.supplier_id = s.id
    WHERE i.id = ?
      AND i.status = 'active'
      AND c.status = 'active'
      AND (sc.id IS NULL OR sc.status = 'active')
      AND (m.id IS NULL OR m.status = 'active')
      AND (s.id IS NULL OR s.status = 'active')
    LIMIT 1
    `,
    [itemId]
  );

  return rows[0];
};

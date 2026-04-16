import {
  createItemRateModel,
  deleteItemRateModel,
  getDuplicateItemRateModel,
  getActiveItemRateLookupsModel,
  getActiveItemRateItemDetailsModel,
  getItemRateByIdModel,
  getItemRatesModel,
  getLatestQuotationIdBySupplierModel,
  updateItemRateModel,
} from "../model/itemRate.model.js";
import { getCategoryByIdModel } from "../model/category.model.js";
import { getSubCategoryByIdModel } from "../model/subCategory.model.js";
import { getManufacturerByIdModel } from "../model/manufacturer.model.js";
import { getSupplierByIdModel } from "../model/supplier.model.js";
import {
  getItemDefinitionByIdModel,
  updateItemDefinitionSpecificationModel,
} from "../model/itemDefinition.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const pickExistingValue = (record, keys, fallback = null) => {
  for (const key of keys) {
    if (record?.[key] !== undefined) {
      return record[key];
    }
  }

  return fallback;
};

const firstBodyValue = (body, keys, fallback) => {
  for (const key of keys) {
    if (hasOwn(body, key)) {
      return body[key];
    }
  }

  return fallback;
};

const toNullable = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue === "" ? null : trimmedValue;
  }

  return value;
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeDateValue = (value) => {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
};

const calculatePricing = ({
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
}) => {
  const requestedCurrency =
    String(currency || "PKR").trim().toUpperCase() === "USD" ? "USD" : "PKR";
  const nextExchangeRate = toNumber(exchange_rate, 1);
  const nextResellerPriceUsd = toNumber(reseller_price_usd, 0);
  const providedResellerPrice = toNumber(reseller_price, 0);
  const calculatedResellerPriceFromUsd =
    nextResellerPriceUsd > 0 && nextExchangeRate > 0
      ? roundMoney(nextResellerPriceUsd * nextExchangeRate)
      : 0;

  // When frontend sends both prices, preserve the PKR amount if it does not
  // match the USD conversion after rounding. This prevents edit mode drift
  // such as 60000 turning into 59999.xx on reopen.
  const nextCurrency =
    requestedCurrency === "USD" &&
    nextResellerPriceUsd > 0 &&
    providedResellerPrice > 0 &&
    calculatedResellerPriceFromUsd !== roundMoney(providedResellerPrice)
      ? "PKR"
      : requestedCurrency;

  const nextResellerPrice =
    providedResellerPrice > 0
      ? roundMoney(providedResellerPrice)
      : nextCurrency === "USD" && nextResellerPriceUsd > 0
      ? calculatedResellerPriceFromUsd
      : roundMoney(providedResellerPrice);

  const nextITaxPercent = toNumber(i_tax_percent, 0);
  const providedITaxAmount = toNumber(i_tax_amount, 0);
  const nextITaxAmount =
    providedITaxAmount > 0
      ? roundMoney(providedITaxAmount)
      : roundMoney((nextResellerPrice * nextITaxPercent) / 100);

  const nextOtherTaxPercent = toNumber(other_tax_percent, 0);
  const providedOtherTaxAmount = toNumber(other_tax_amount, 0);
  const nextOtherTaxAmount =
    providedOtherTaxAmount > 0
      ? roundMoney(providedOtherTaxAmount)
      : roundMoney((nextResellerPrice * nextOtherTaxPercent) / 100);

  const nextProfitPercent = toNumber(profit_percent, 0);
  const providedProfitAmount = toNumber(profit_amount, 0);
  const nextProfitAmount =
    providedProfitAmount > 0
      ? roundMoney(providedProfitAmount)
      : roundMoney((nextResellerPrice * nextProfitPercent) / 100);

  const calculatedSalePrice = roundMoney(
    nextResellerPrice + nextITaxAmount + nextOtherTaxAmount + nextProfitAmount
  );
  const providedSalePrice = toNumber(sale_price, 0);
  const nextSalePrice =
    providedSalePrice > 0 && roundMoney(providedSalePrice) === calculatedSalePrice
      ? roundMoney(providedSalePrice)
      : calculatedSalePrice;

  const nextSalesTaxPercent = toNumber(sales_tax_percent, 18);
  const providedSalesTaxAmount = toNumber(sales_tax_amount, 0);
  const calculatedSalesTaxAmount = roundMoney((nextSalePrice * nextSalesTaxPercent) / 100);
  const nextSalesTaxAmount =
    providedSalesTaxAmount > 0 && roundMoney(providedSalesTaxAmount) === calculatedSalesTaxAmount
      ? roundMoney(providedSalesTaxAmount)
      : calculatedSalesTaxAmount;

  return {
    currency: nextCurrency,
    exchange_rate: nextExchangeRate,
    reseller_price_usd:
      nextCurrency === "USD" && nextResellerPriceUsd > 0
        ? roundMoney(nextResellerPriceUsd)
        : 0,
    reseller_price: nextResellerPrice,
    sale_price: nextSalePrice,
    sales_tax_percent: nextSalesTaxPercent,
    sales_tax_amount: nextSalesTaxAmount,
    i_tax_percent: nextITaxPercent,
    i_tax_amount: nextITaxAmount,
    other_tax_percent: nextOtherTaxPercent,
    other_tax_amount: nextOtherTaxAmount,
    profit_percent: nextProfitPercent,
    profit_amount: nextProfitAmount,
    sale_price_with_tax: roundMoney(nextSalePrice + nextSalesTaxAmount),
  };
};

const validateNonNegativeNumbers = (values) => {
  for (const [field, value] of Object.entries(values)) {
    if (Number.isNaN(value)) {
      return `${field} must be a valid number`;
    }

    if (value < 0) {
      return `${field} cannot be negative`;
    }
  }

  return null;
};

const ensureActiveRecord = async (label, id, getter, required = false) => {
  if (id === null || id === undefined) {
    return required ? { error: `${label} is required` } : { record: null };
  }

  if (Number.isNaN(id)) {
    return { error: `${label} is invalid` };
  }

  const record = await getter(id);
  if (!record || record.status === "inactive") {
    return { error: `${label} does not exist` };
  }

  return { record };
};

const buildItemRatePayload = async (body, existing = null) => {
  const rateDate = hasOwn(body, "rate_date")
    ? toNullable(body.rate_date)
    : normalizeDateValue(pickExistingValue(existing, ["rate_date", "rateDate"]));
  const supplierId = hasOwn(body, "supplier_id")
    ? toNumberOrNull(body.supplier_id)
    : pickExistingValue(existing, ["supplier_id", "supplierId"]);
  const categoryId = hasOwn(body, "category_id")
    ? toNumberOrNull(body.category_id)
    : pickExistingValue(existing, ["category_id", "categoryId"]);
  const subCategoryId = hasOwn(body, "sub_category_id")
    ? toNumberOrNull(body.sub_category_id)
    : pickExistingValue(existing, ["sub_category_id", "subCategoryId"]);
  const manufacturerId = hasOwn(body, "manufacturer_id")
    ? toNumberOrNull(body.manufacturer_id)
    : pickExistingValue(existing, ["manufacturer_id", "manufacturerId"]);
  const itemDefinitionId = hasOwn(body, "item_definition_id")
    ? toNumberOrNull(body.item_definition_id)
    : pickExistingValue(existing, ["item_definition_id", "itemDefinitionId"]);

  if (!rateDate) {
    return { error: "rate_date is required" };
  }

  const supplierCheck = await ensureActiveRecord("supplier_id", supplierId, getSupplierByIdModel, true);
  if (supplierCheck.error) return { error: supplierCheck.error };

  const categoryCheck = await ensureActiveRecord("category_id", categoryId, getCategoryByIdModel, true);
  if (categoryCheck.error) return { error: categoryCheck.error };

  const subCategoryCheck = await ensureActiveRecord(
    "sub_category_id",
    subCategoryId,
    getSubCategoryByIdModel
  );
  if (subCategoryCheck.error) return { error: subCategoryCheck.error };

  if (
    subCategoryCheck.record &&
    Number(subCategoryCheck.record.category_id) !== Number(categoryId)
  ) {
    return { error: "Selected sub category does not belong to selected category" };
  }

  const manufacturerCheck = await ensureActiveRecord(
    "manufacturer_id",
    manufacturerId,
    getManufacturerByIdModel
  );
  if (manufacturerCheck.error) return { error: manufacturerCheck.error };

  const itemCheck = await ensureActiveRecord(
    "item_definition_id",
    itemDefinitionId,
    getItemDefinitionByIdModel,
    true
  );
  if (itemCheck.error) return { error: itemCheck.error };

  const item = itemCheck.record;
  if (Number(item.category_id) !== Number(categoryId)) {
    return { error: "Selected item does not belong to selected category" };
  }

  if (
    subCategoryId !== null &&
    item.sub_category_id !== null &&
    Number(item.sub_category_id) !== Number(subCategoryId)
  ) {
    return { error: "Selected item does not belong to selected sub category" };
  }

  const pricing = calculatePricing({
    currency: hasOwn(body, "currency") ? body.currency : existing?.currency,
    exchange_rate: hasOwn(body, "exchange_rate")
      ? body.exchange_rate
      : pickExistingValue(existing, ["exchange_rate", "exchangeRate"]),
    reseller_price_usd: hasOwn(body, "reseller_price_usd")
      ? body.reseller_price_usd
      : pickExistingValue(existing, ["reseller_price_usd", "resellerPriceUsd"]),
    reseller_price: hasOwn(body, "reseller_price")
      ? body.reseller_price
      : pickExistingValue(existing, ["reseller_price", "resellerPrice"]),
    sale_price: hasOwn(body, "sale_price")
      ? body.sale_price
      : pickExistingValue(existing, ["sale_price", "salePrice"]),
    sales_tax_percent: hasOwn(body, "sales_tax_percent")
      ? body.sales_tax_percent
      : pickExistingValue(existing, ["sales_tax_percent", "salesTaxPercent"]),
    sales_tax_amount: hasOwn(body, "sales_tax_amount")
      ? body.sales_tax_amount
      : pickExistingValue(existing, ["sales_tax_amount", "salesTaxAmount"]),
    i_tax_percent: firstBodyValue(
      body,
      ["i_tax_percent", "iTaxPercent", "iTaxPercentage"],
      pickExistingValue(existing, ["i_tax_percent", "iTaxPercent"])
    ),
    i_tax_amount: firstBodyValue(
      body,
      ["i_tax_amount", "iTaxAmount"],
      pickExistingValue(existing, ["i_tax_amount", "iTaxAmount"])
    ),
    other_tax_percent: firstBodyValue(
      body,
      ["other_tax_percent", "otherTaxPercent", "othersPercentage"],
      pickExistingValue(existing, ["other_tax_percent", "otherTaxPercent"])
    ),
    other_tax_amount: firstBodyValue(
      body,
      ["other_tax_amount", "otherTaxAmount", "othersAmount"],
      pickExistingValue(existing, ["other_tax_amount", "otherTaxAmount"])
    ),
    profit_percent: firstBodyValue(
      body,
      ["profit_percent", "profitTaxPercent", "profitPercentage"],
      pickExistingValue(existing, ["profit_percent", "profitPercent"])
    ),
    profit_amount: firstBodyValue(
      body,
      ["profit_amount", "profitAmount"],
      pickExistingValue(existing, ["profit_amount", "profitAmount"])
    ),
  });

  const numberError = validateNonNegativeNumbers(pricing);
  if (numberError) {
    return { error: numberError };
  }

  if (pricing.currency === "USD" && pricing.exchange_rate <= 0) {
    return { error: "exchange_rate is required when currency is USD" };
  }

  return {
    payload: {
      rate_date: rateDate,
      supplier_id: Number(supplierId),
      quotation_id: hasOwn(body, "quotation_id")
        ? toNullable(body.quotation_id)
        : toNullable(pickExistingValue(existing, ["quotation_id", "quotationId"])),
      category_id: Number(categoryId),
      sub_category_id: subCategoryId,
      manufacturer_id: manufacturerId,
      item_definition_id: Number(itemDefinitionId),
      item_specification: hasOwn(body, "item_specification")
        ? toNullable(body.item_specification)
        : toNullable(
            pickExistingValue(existing, ["item_specification", "itemSpecification"], item.item_specification)
          ),
      ...pricing,
      status: body.status || existing?.status || "active",
    },
  };
};

export const createItemRate = async (req, res) => {
  try {
    const built = await buildItemRatePayload(req.body);
    if (built.error) {
      return errorResponse(res, built.error, 400);
    }

    const duplicateItemRate = await getDuplicateItemRateModel(built.payload);
    if (duplicateItemRate) {
      return errorResponse(res, "Item rate already exists for this item", 409);
    }

    const result = await createItemRateModel(built.payload);
    await updateItemDefinitionSpecificationModel(
      built.payload.item_definition_id,
      built.payload.item_specification
    );
    const itemRate = await getItemRateByIdModel(result.insertId);

    return successResponse(res, "Item rate created successfully", itemRate, 201);
  } catch (error) {
    return errorResponse(res, "Failed to create item rate", 500, error.message);
  }
};

export const getItemRates = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const itemRates = await getItemRatesModel(search, status);

    return successResponse(res, "Item rates fetched successfully", {
      records: itemRates.length,
      itemRates,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch item rates", 500, error.message);
  }
};

export const getItemRateById = async (req, res) => {
  try {
    const itemRate = await getItemRateByIdModel(req.params.id);
    if (!itemRate) {
      return errorResponse(res, "Item rate not found", 404);
    }

    return successResponse(res, "Item rate fetched successfully", itemRate);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item rate", 500, error.message);
  }
};

export const updateItemRate = async (req, res) => {
  try {
    const itemRate = await getItemRateByIdModel(req.params.id);
    if (!itemRate) {
      return errorResponse(res, "Item rate not found", 404);
    }

    const built = await buildItemRatePayload(req.body, itemRate);
    if (built.error) {
      return errorResponse(res, built.error, 400);
    }

    const duplicateItemRate = await getDuplicateItemRateModel(built.payload);
    if (duplicateItemRate && Number(duplicateItemRate.id) !== Number(req.params.id)) {
      return errorResponse(res, "Item rate already exists for this item", 409);
    }

    await updateItemRateModel({ id: req.params.id, ...built.payload });
    await updateItemDefinitionSpecificationModel(
      built.payload.item_definition_id,
      built.payload.item_specification
    );
    const updated = await getItemRateByIdModel(req.params.id);

    return successResponse(res, "Item rate updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update item rate", 500, error.message);
  }
};

export const deleteItemRate = async (req, res) => {
  try {
    const itemRate = await getItemRateByIdModel(req.params.id);
    if (!itemRate) {
      return errorResponse(res, "Item rate not found", 404);
    }

    await deleteItemRateModel(req.params.id);
    return successResponse(res, "Item rate deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete item rate", 500, error.message);
  }
};

export const getItemRateLookups = async (req, res) => {
  try {
    const lookups = await getActiveItemRateLookupsModel();
    return successResponse(res, "Item rate lookups fetched successfully", lookups);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item rate lookups", 500, error.message);
  }
};

export const getSupplierQuotationId = async (req, res) => {
  try {
    const supplier = await getSupplierByIdModel(req.params.supplierId);
    if (!supplier || supplier.status === "inactive") {
      return errorResponse(res, "Supplier not found", 404);
    }

    const quotation_id = await getLatestQuotationIdBySupplierModel(req.params.supplierId);
    return successResponse(res, "Supplier quotation id fetched successfully", {
      supplier_id: Number(req.params.supplierId),
      quotation_id,
      quotationId: quotation_id,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch supplier quotation id", 500, error.message);
  }
};

export const getItemRateItemDetails = async (req, res) => {
  try {
    const itemId = Number(req.params.itemId);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return errorResponse(res, "Valid item id is required", 400);
    }

    const item = await getActiveItemRateItemDetailsModel(itemId);
    if (!item) {
      return errorResponse(res, "Active item not found", 404);
    }

    return successResponse(res, "Item details fetched successfully", item);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item details", 500, error.message);
  }
};

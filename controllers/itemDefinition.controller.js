import {
  createItemDefinitionModel,
  deleteItemDefinitionModel,
  generateItemCodeModel,
  getItemDefinitionByBarcodeModel,
  getItemDefinitionByIdModel,
  getItemDefinitionByItemCodeModel,
  getItemDefinitionsModel,
  getLowStockItemDefinitionsCountModel,
  getLowStockItemDefinitionsModel,
  markLowStockItemDefinitionAsReadModel,
  updateItemDefinitionModel,
} from "../model/itemDefinition.model.js";
import { getItemTypeByIdModel } from "../model/itemType.model.js";
import { getCategoryByIdModel } from "../model/category.model.js";
import { getSubCategoryByIdModel } from "../model/subCategory.model.js";
import { getManufacturerByIdModel } from "../model/manufacturer.model.js";
import { getSupplierByIdModel } from "../model/supplier.model.js";
import { getUnitByIdModel } from "../model/unit.model.js";
import { getLocationByIdModel } from "../model/location.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { removeLocalFile, toPublicUploadUrl } from "../utils/localFiles.js";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

const toNullable = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (
      trimmedValue === "" ||
      trimmedValue.toLowerCase() === "null" ||
      trimmedValue.toLowerCase() === "undefined"
    ) {
      return null;
    }

    return trimmedValue;
  }

  return value;
};

const toNumberOrNull = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim().toLowerCase();

    if (
      trimmedValue === "" ||
      trimmedValue === "null" ||
      trimmedValue === "undefined"
    ) {
      return null;
    }
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const toBooleanFlag = (value, fallback = 0) => {
  if (value === undefined) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }

  if (typeof value === "number") {
    return value === 1 ? 1 : 0;
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (["true", "1", "yes", "on"].includes(normalizedValue)) {
    return 1;
  }

  if (["false", "0", "no", "off", ""].includes(normalizedValue)) {
    return 0;
  }

  return null;
};

const validateBarcodeSelection = (primaryBarcode, secondaryBarcode) => {
  const providedCount = [primaryBarcode, secondaryBarcode].filter(Boolean).length;

  if (providedCount === 0) {
    return "Either primary_barcode or secondary_barcode is required";
  }

  return null;
};

const ensureActiveLookup = async (label, id, getter) => {
  if (id === null || id === undefined) {
    return { record: null };
  }

  const record = await getter(id);

  if (!record || record.status === "inactive") {
    return { error: `${label} does not exist` };
  }

  return { record };
};

const ensureNonNegativeNumber = (value, fieldName) => {
  if (Number.isNaN(value)) {
    return `${fieldName} must be a valid number`;
  }

  if (value !== null && value < 0) {
    return `${fieldName} cannot be negative`;
  }

  return null;
};

export const createItemDefinition = async (req, res) => {
  try {
    const uploadedImage = toPublicUploadUrl(req.file?.path);
    const {
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
    } = req.body;

    if (!item_type_id) {
      return errorResponse(res, "item_type_id is required", 400);
    }

    if (!category_id) {
      return errorResponse(res, "category_id is required", 400);
    }

    if (!item_name?.trim()) {
      return errorResponse(res, "item_name is required", 400);
    }

    if (!unit_id) {
      return errorResponse(res, "unit_id is required", 400);
    }

    if (reorder_level === undefined || reorder_level === null || reorder_level === "") {
      return errorResponse(res, "reorder_level is required", 400);
    }

    const nextItemCode = item_code?.trim() || await generateItemCodeModel();
    const nextPrimaryBarcode = toNullable(primary_barcode);
    const nextSecondaryBarcode = toNullable(secondary_barcode);
    const barcodeError = validateBarcodeSelection(nextPrimaryBarcode, nextSecondaryBarcode);

    if (barcodeError) {
      return errorResponse(res, barcodeError, 400);
    }

    const existingItemCode = await getItemDefinitionByItemCodeModel(nextItemCode);
    if (existingItemCode) {
      return errorResponse(res, "Item code already exists", 409);
    }

    const barcodesToCheck = [...new Set([nextPrimaryBarcode, nextSecondaryBarcode].filter(Boolean))];
    for (const barcode of barcodesToCheck) {
      const existingBarcode = await getItemDefinitionByBarcodeModel(barcode);
      if (existingBarcode) {
        return errorResponse(res, "Barcode already exists", 409);
      }
    }

    const itemTypeIdValue = toNumberOrNull(item_type_id);
    const categoryIdValue = toNumberOrNull(category_id);
    const subCategoryIdValue = toNumberOrNull(sub_category_id);
    const manufacturerIdValue = toNumberOrNull(manufacturer_id);
    const supplierIdValue = toNumberOrNull(supplier_id);
    const unitIdValue = toNumberOrNull(unit_id);
    const locationIdValue = toNumberOrNull(location_id);
    const nextUnitQty = toNumberOrNull(unit_qty) ?? 0;
    const nextReorderLevel = toNumberOrNull(reorder_level);
    const nextPurchasePrice = toNumberOrNull(purchase_price) ?? 0;
    const nextSalePrice = toNumberOrNull(sale_price) ?? 0;
    const nextExpiryDays = toNumberOrNull(expiry_days);
    const nextIsExpirable = toBooleanFlag(is_expirable, 0);
    const nextIsCostItem = toBooleanFlag(is_cost_item, 0);
    const nextStopSale = toBooleanFlag(stop_sale, 0);

    for (const value of [
      itemTypeIdValue,
      categoryIdValue,
      subCategoryIdValue,
      manufacturerIdValue,
      supplierIdValue,
      unitIdValue,
      locationIdValue,
    ]) {
      if (Number.isNaN(value)) {
        return errorResponse(res, "One or more selected ids are invalid", 400);
      }
    }

    for (const validationError of [
      ensureNonNegativeNumber(nextUnitQty, "unit_qty"),
      ensureNonNegativeNumber(nextReorderLevel, "reorder_level"),
      ensureNonNegativeNumber(nextPurchasePrice, "purchase_price"),
      ensureNonNegativeNumber(nextSalePrice, "sale_price"),
      ensureNonNegativeNumber(nextExpiryDays, "expiry_days"),
    ]) {
      if (validationError) {
        return errorResponse(res, validationError, 400);
      }
    }

    if (nextIsExpirable === null) {
      return errorResponse(res, "is_expirable must be a valid boolean", 400);
    }

    if (nextIsCostItem === null) {
      return errorResponse(res, "is_cost_item must be a valid boolean", 400);
    }

    if (nextStopSale === null) {
      return errorResponse(res, "stop_sale must be a valid boolean", 400);
    }

    if (nextIsExpirable && (nextExpiryDays === null || nextExpiryDays === 0)) {
      return errorResponse(res, "expiry_days is required when is_expirable is true", 400);
    }

    const itemTypeCheck = await ensureActiveLookup("Selected item type", itemTypeIdValue, getItemTypeByIdModel);
    if (itemTypeCheck.error) {
      return errorResponse(res, itemTypeCheck.error, 400);
    }

    const categoryCheck = await ensureActiveLookup("Selected category", categoryIdValue, getCategoryByIdModel);
    if (categoryCheck.error) {
      return errorResponse(res, categoryCheck.error, 400);
    }

    let subCategoryRecord = null;
    if (subCategoryIdValue !== null) {
      const subCategoryCheck = await ensureActiveLookup(
        "Selected sub category",
        subCategoryIdValue,
        getSubCategoryByIdModel
      );

      if (subCategoryCheck.error) {
        return errorResponse(res, subCategoryCheck.error, 400);
      }

      subCategoryRecord = subCategoryCheck.record;

      if (subCategoryRecord.category_id !== categoryIdValue) {
        return errorResponse(res, "Selected sub category does not belong to the selected category", 400);
      }
    }

    const manufacturerCheck = await ensureActiveLookup(
      "Selected manufacturer",
      manufacturerIdValue,
      getManufacturerByIdModel
    );
    if (manufacturerCheck.error) {
      return errorResponse(res, manufacturerCheck.error, 400);
    }

    const supplierCheck = await ensureActiveLookup(
      "Selected supplier",
      supplierIdValue,
      getSupplierByIdModel
    );
    if (supplierCheck.error) {
      return errorResponse(res, supplierCheck.error, 400);
    }

    const unitCheck = await ensureActiveLookup("Selected unit", unitIdValue, getUnitByIdModel);
    if (unitCheck.error) {
      return errorResponse(res, unitCheck.error, 400);
    }

    const locationCheck = await ensureActiveLookup(
      "Selected location",
      locationIdValue,
      getLocationByIdModel
    );
    if (locationCheck.error) {
      return errorResponse(res, locationCheck.error, 400);
    }

    const result = await createItemDefinitionModel({
      item_code: nextItemCode,
      primary_barcode: nextPrimaryBarcode,
      secondary_barcode: nextSecondaryBarcode,
      item_type_id: itemTypeIdValue,
      category_id: categoryIdValue,
      sub_category_id: subCategoryIdValue,
      manufacturer_id: manufacturerIdValue,
      supplier_id: supplierIdValue,
      item_name: item_name.trim(),
      unit_id: unitIdValue,
      unit_qty: nextUnitQty,
      reorder_level: nextReorderLevel,
      location_id: locationIdValue,
      purchase_price: nextPurchasePrice,
      sale_price: nextSalePrice,
      is_expirable: nextIsExpirable,
      expiry_days: nextIsExpirable ? nextExpiryDays : null,
      is_cost_item: nextIsCostItem,
      stop_sale: nextStopSale,
      image: toNullable(uploadedImage || image),
      status: status || "active",
    });

    return successResponse(
      res,
      "Item definition created successfully",
      {
        item_definition_id: result.insertId,
        item_code: nextItemCode,
      },
      201
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "Duplicate item definition data already exists", 409);
    }

    return errorResponse(res, "Failed to create item definition", 500, error.message);
  }
};

export const getItemDefinitions = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const itemDefinitions = await getItemDefinitionsModel(search, status);

    return successResponse(res, "Item definitions fetched successfully", {
      records: itemDefinitions.length,
      itemDefinitions,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch item definitions", 500, error.message);
  }
};

export const getItemDefinitionById = async (req, res) => {
  try {
    const itemDefinition = await getItemDefinitionByIdModel(req.params.id);

    if (!itemDefinition) {
      return errorResponse(res, "Item definition not found", 404);
    }

    return successResponse(res, "Item definition fetched successfully", itemDefinition);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item definition", 500, error.message);
  }
};

export const getItemDefinitionByBarcode = async (req, res) => {
  try {
    const { barcode } = req.params;

    if (!barcode || !barcode.trim()) {
      return errorResponse(res, "Barcode is required", 400);
    }

    const itemDefinition = await getItemDefinitionByBarcodeModel(barcode.trim());

    if (!itemDefinition) {
      return errorResponse(res, "Item definition not found for the given barcode", 404);
    }

    return successResponse(res, "Item definition fetched successfully", itemDefinition);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item definition by barcode", 500, error.message);
  }
};

export const getLowStockItemDefinitions = async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemDefinitions = await getLowStockItemDefinitionsModel(userId);

    return successResponse(res, "Low stock items fetched successfully", {
      records: itemDefinitions.length,
      itemDefinitions,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch low stock items", 500, error.message);
  }
};

export const getLowStockItemDefinitionsCount = async (req, res) => {
  try {
    const userId = req.user?.id;
    const total = await getLowStockItemDefinitionsCountModel(userId);

    return successResponse(res, "Low stock item count fetched successfully", {
      total,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch low stock item count", 500, error.message);
  }
};

export const markLowStockItemDefinitionAsRead = async (req, res) => {
  try {
    const itemDefinitionId = Number(req.params.id);

    if (!Number.isInteger(itemDefinitionId) || itemDefinitionId <= 0) {
      return errorResponse(res, "Valid item definition id is required", 400);
    }

    const userId = req.user?.id;
    const marked = await markLowStockItemDefinitionAsReadModel(itemDefinitionId, userId);

    if (!marked) {
      return errorResponse(res, "Low stock item notification not found", 404);
    }

    return successResponse(res, "Low stock notification marked as read", {
      item_definition_id: itemDefinitionId,
    });
  } catch (error) {
    return errorResponse(res, "Failed to mark low stock notification as read", 500, error.message);
  }
};

export const updateItemDefinition = async (req, res) => {
  try {
    const uploadedImage = toPublicUploadUrl(req.file?.path);
    const itemDefinitionId = req.params.id;
    const itemDefinition = await getItemDefinitionByIdModel(itemDefinitionId);

    if (!itemDefinition) {
      return errorResponse(res, "Item definition not found", 404);
    }

    const previousImage = itemDefinition.image;
    const {
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
    } = req.body;

    const nextItemCode = item_code?.trim() || itemDefinition.item_code;
    const nextPrimaryBarcode = hasOwn(req.body, "primary_barcode")
      ? toNullable(primary_barcode)
      : itemDefinition.primary_barcode;
    const nextSecondaryBarcode = hasOwn(req.body, "secondary_barcode")
      ? toNullable(secondary_barcode)
      : itemDefinition.secondary_barcode;

    const barcodeError = validateBarcodeSelection(nextPrimaryBarcode, nextSecondaryBarcode);
    if (barcodeError) {
      return errorResponse(res, barcodeError, 400);
    }

    if (
      nextItemCode.trim().toLowerCase() !== String(itemDefinition.item_code).trim().toLowerCase()
    ) {
      const existingItemCode = await getItemDefinitionByItemCodeModel(nextItemCode);
      if (existingItemCode && existingItemCode.id !== Number(itemDefinitionId)) {
        return errorResponse(res, "Item code already exists", 409);
      }
    }

    const barcodesToCheck = [...new Set([nextPrimaryBarcode, nextSecondaryBarcode].filter(Boolean))];
    for (const barcode of barcodesToCheck) {
      const existingBarcode = await getItemDefinitionByBarcodeModel(barcode);
      if (existingBarcode && existingBarcode.id !== Number(itemDefinitionId)) {
        return errorResponse(res, "Barcode already exists", 409);
      }
    }

    const itemTypeIdValue = hasOwn(req.body, "item_type_id")
      ? toNumberOrNull(item_type_id)
      : itemDefinition.item_type_id;
    const categoryIdValue = hasOwn(req.body, "category_id")
      ? toNumberOrNull(category_id)
      : itemDefinition.category_id;
    const subCategoryIdValue = hasOwn(req.body, "sub_category_id")
      ? toNumberOrNull(sub_category_id)
      : itemDefinition.sub_category_id;
    const manufacturerIdValue = hasOwn(req.body, "manufacturer_id")
      ? toNumberOrNull(manufacturer_id)
      : itemDefinition.manufacturer_id;
    const supplierIdValue = hasOwn(req.body, "supplier_id")
      ? toNumberOrNull(supplier_id)
      : itemDefinition.supplier_id;
    const unitIdValue = hasOwn(req.body, "unit_id")
      ? toNumberOrNull(unit_id)
      : itemDefinition.unit_id;
    const locationIdValue = hasOwn(req.body, "location_id")
      ? toNumberOrNull(location_id)
      : itemDefinition.location_id;
    const nextUnitQty = hasOwn(req.body, "unit_qty")
      ? (toNumberOrNull(unit_qty) ?? 0)
      : Number(itemDefinition.unit_qty ?? 0);
    const nextReorderLevel = hasOwn(req.body, "reorder_level")
      ? toNumberOrNull(reorder_level)
      : Number(itemDefinition.reorder_level ?? 0);
    const nextPurchasePrice = hasOwn(req.body, "purchase_price")
      ? (toNumberOrNull(purchase_price) ?? 0)
      : Number(itemDefinition.purchase_price ?? 0);
    const nextSalePrice = hasOwn(req.body, "sale_price")
      ? (toNumberOrNull(sale_price) ?? 0)
      : Number(itemDefinition.sale_price ?? 0);
    const nextIsExpirable = hasOwn(req.body, "is_expirable")
      ? toBooleanFlag(is_expirable)
      : Number(itemDefinition.is_expirable);
    const nextExpiryDays = hasOwn(req.body, "expiry_days")
      ? toNumberOrNull(expiry_days)
      : itemDefinition.expiry_days;
    const nextIsCostItem = hasOwn(req.body, "is_cost_item")
      ? toBooleanFlag(is_cost_item)
      : Number(itemDefinition.is_cost_item);
    const nextStopSale = hasOwn(req.body, "stop_sale")
      ? toBooleanFlag(stop_sale)
      : Number(itemDefinition.stop_sale);

    for (const value of [
      itemTypeIdValue,
      categoryIdValue,
      subCategoryIdValue,
      manufacturerIdValue,
      supplierIdValue,
      unitIdValue,
      locationIdValue,
    ]) {
      if (Number.isNaN(value)) {
        return errorResponse(res, "One or more selected ids are invalid", 400);
      }
    }

    for (const validationError of [
      ensureNonNegativeNumber(nextUnitQty, "unit_qty"),
      ensureNonNegativeNumber(nextReorderLevel, "reorder_level"),
      ensureNonNegativeNumber(nextPurchasePrice, "purchase_price"),
      ensureNonNegativeNumber(nextSalePrice, "sale_price"),
      ensureNonNegativeNumber(nextExpiryDays, "expiry_days"),
    ]) {
      if (validationError) {
        return errorResponse(res, validationError, 400);
      }
    }

    if (nextIsExpirable === null) {
      return errorResponse(res, "is_expirable must be a valid boolean", 400);
    }

    if (nextIsCostItem === null) {
      return errorResponse(res, "is_cost_item must be a valid boolean", 400);
    }

    if (nextStopSale === null) {
      return errorResponse(res, "stop_sale must be a valid boolean", 400);
    }

    if (nextReorderLevel === null) {
      return errorResponse(res, "reorder_level is required", 400);
    }

    if (hasOwn(req.body, "item_name") && !item_name?.trim()) {
      return errorResponse(res, "item_name is required", 400);
    }

    const nextItemName = item_name?.trim() || itemDefinition.item_name;

    if (nextIsExpirable && (nextExpiryDays === null || nextExpiryDays === 0)) {
      return errorResponse(res, "expiry_days is required when is_expirable is true", 400);
    }

    if (!itemTypeIdValue) {
      return errorResponse(res, "item_type_id is required", 400);
    }

    if (!categoryIdValue) {
      return errorResponse(res, "category_id is required", 400);
    }

    if (!unitIdValue) {
      return errorResponse(res, "unit_id is required", 400);
    }

    const itemTypeCheck = await ensureActiveLookup("Selected item type", itemTypeIdValue, getItemTypeByIdModel);
    if (itemTypeCheck.error) {
      return errorResponse(res, itemTypeCheck.error, 400);
    }

    const categoryCheck = await ensureActiveLookup("Selected category", categoryIdValue, getCategoryByIdModel);
    if (categoryCheck.error) {
      return errorResponse(res, categoryCheck.error, 400);
    }

    const unitCheck = await ensureActiveLookup("Selected unit", unitIdValue, getUnitByIdModel);
    if (unitCheck.error) {
      return errorResponse(res, unitCheck.error, 400);
    }

    if (subCategoryIdValue !== null) {
      const subCategoryCheck = await ensureActiveLookup(
        "Selected sub category",
        subCategoryIdValue,
        getSubCategoryByIdModel
      );

      if (subCategoryCheck.error) {
        return errorResponse(res, subCategoryCheck.error, 400);
      }

      if (subCategoryCheck.record.category_id !== Number(categoryIdValue)) {
        return errorResponse(res, "Selected sub category does not belong to the selected category", 400);
      }
    }

    const manufacturerCheck = await ensureActiveLookup(
      "Selected manufacturer",
      manufacturerIdValue,
      getManufacturerByIdModel
    );
    if (manufacturerCheck.error) {
      return errorResponse(res, manufacturerCheck.error, 400);
    }

    const supplierCheck = await ensureActiveLookup(
      "Selected supplier",
      supplierIdValue,
      getSupplierByIdModel
    );
    if (supplierCheck.error) {
      return errorResponse(res, supplierCheck.error, 400);
    }

    const locationCheck = await ensureActiveLookup(
      "Selected location",
      locationIdValue,
      getLocationByIdModel
    );
    if (locationCheck.error) {
      return errorResponse(res, locationCheck.error, 400);
    }

    let nextImage = itemDefinition.image;

    if (uploadedImage) {
      nextImage = uploadedImage;
    } else if (hasOwn(req.body, "image")) {
      nextImage = toNullable(image);
    }

    await updateItemDefinitionModel({
      id: itemDefinitionId,
      item_code: nextItemCode,
      primary_barcode: nextPrimaryBarcode,
      secondary_barcode: nextSecondaryBarcode,
      item_type_id: Number(itemTypeIdValue),
      category_id: Number(categoryIdValue),
      sub_category_id: subCategoryIdValue,
      manufacturer_id: manufacturerIdValue,
      supplier_id: supplierIdValue,
      item_name: nextItemName,
      unit_id: Number(unitIdValue),
      unit_qty: nextUnitQty,
      reorder_level: nextReorderLevel,
      location_id: locationIdValue,
      purchase_price: nextPurchasePrice,
      sale_price: nextSalePrice,
      is_expirable: nextIsExpirable,
      expiry_days: nextIsExpirable ? nextExpiryDays : null,
      is_cost_item: nextIsCostItem,
      stop_sale: nextStopSale,
      image: nextImage,
      status: status ?? itemDefinition.status,
    });

    if (previousImage && previousImage !== nextImage) {
      await removeLocalFile(previousImage);
    }

    const updatedItemDefinition = await getItemDefinitionByIdModel(itemDefinitionId);

    return successResponse(
      res,
      "Item definition updated successfully",
      updatedItemDefinition
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "Duplicate item definition data already exists", 409);
    }

    return errorResponse(res, "Failed to update item definition", 500, error.message);
  }
};

export const deleteItemDefinition = async (req, res) => {
  try {
    const itemDefinitionId = req.params.id;
    const itemDefinition = await getItemDefinitionByIdModel(itemDefinitionId);

    if (!itemDefinition) {
      return errorResponse(res, "Item definition not found", 404);
    }

    await deleteItemDefinitionModel(itemDefinitionId);
    await removeLocalFile(itemDefinition.image);

    return successResponse(res, "Item definition deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete item definition", 500, error.message);
  }
};

import {
  getOpeningStockItemsModel,
  updateOpeningStockModel,
} from "../model/openingStock.model.js";
import { getItemDefinitionByIdModel } from "../model/itemDefinition.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const getOpeningStockItems = async (req, res) => {
  try {
    const { item_type_id, category_id, sub_category_id, search } = req.query;

    const items = await getOpeningStockItemsModel({
      item_type_id: item_type_id || null,
      category_id: category_id || null,
      sub_category_id: sub_category_id || null,
      search: search || "",
    });

    return successResponse(res, "Opening stock items fetched successfully", items);
  } catch (error) {
    console.error("getOpeningStockItems error:", error);
    return errorResponse(res, "Failed to fetch opening stock items", 500);
  }
};

export const bulkUpdateOpeningStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return errorResponse(res, "items array is required and must not be empty", 400);
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      const { id, purchase_price, sale_price, stock } = item;

      if (!id) {
        errors.push({ id, error: "id is required" });
        continue;
      }

      const parsedPurchasePrice = Number(purchase_price);
      const parsedSalePrice = Number(sale_price);
      const parsedStock = Number(stock);

      if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
        errors.push({ id, error: "purchase_price must be a valid non-negative number" });
        continue;
      }

      if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
        errors.push({ id, error: "sale_price must be a valid non-negative number" });
        continue;
      }

      if (!Number.isFinite(parsedStock) || parsedStock < 0) {
        errors.push({ id, error: "stock must be a valid non-negative number" });
        continue;
      }

      const existingItem = await getItemDefinitionByIdModel(id);
      if (!existingItem) {
        errors.push({ id, error: "Item not found" });
        continue;
      }

      await updateOpeningStockModel(id, {
        purchase_price: parsedPurchasePrice,
        sale_price: parsedSalePrice,
        stock: parsedStock,
      });

      const updatedItem = await getItemDefinitionByIdModel(id);
      const boxes =
        updatedItem.unit_qty > 0
          ? parseFloat((parsedStock / updatedItem.unit_qty).toFixed(2))
          : 0;

      results.push({ ...updatedItem, boxes });
    }

    if (errors.length > 0 && results.length === 0) {
      return errorResponse(res, "All items failed to update", 400, { errors });
    }

    return successResponse(res, "Opening stock bulk updated successfully", {
      updated: results,
      errors,
    });
  } catch (error) {
    console.error("bulkUpdateOpeningStock error:", error);
    return errorResponse(res, "Failed to bulk update opening stock", 500);
  }
};

export const updateOpeningStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { purchase_price, sale_price, stock } = req.body;

    if (!id) {
      return errorResponse(res, "Item id is required", 400);
    }

    const item = await getItemDefinitionByIdModel(id);
    if (!item) {
      return errorResponse(res, "Item not found", 404);
    }

    const parsedPurchasePrice = Number(purchase_price);
    const parsedSalePrice = Number(sale_price);
    const parsedStock = Number(stock);

    if (!Number.isFinite(parsedPurchasePrice) || parsedPurchasePrice < 0) {
      return errorResponse(res, "purchase_price must be a valid non-negative number", 400);
    }

    if (!Number.isFinite(parsedSalePrice) || parsedSalePrice < 0) {
      return errorResponse(res, "sale_price must be a valid non-negative number", 400);
    }

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      return errorResponse(res, "stock must be a valid non-negative number", 400);
    }

    await updateOpeningStockModel(id, {
      purchase_price: parsedPurchasePrice,
      sale_price: parsedSalePrice,
      stock: parsedStock,
    });

    const updatedItem = await getItemDefinitionByIdModel(id);

    const boxes =
      updatedItem.unit_qty > 0
        ? parseFloat((parsedStock / updatedItem.unit_qty).toFixed(2))
        : 0;

    return successResponse(res, "Opening stock updated successfully", {
      ...updatedItem,
      boxes,
    });
  } catch (error) {
    console.error("updateOpeningStock error:", error);
    return errorResponse(res, "Failed to update opening stock", 500);
  }
};

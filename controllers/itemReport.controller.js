import {
  getItemReportItemByIdModel,
  getItemReportItemsModel,
} from "../model/itemReport.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const getItemReportItems = async (req, res) => {
  try {
    const { item_type_id, category_id, sub_category_id, search } = req.query;

    const items = await getItemReportItemsModel({
      item_type_id: item_type_id || null,
      category_id: category_id || null,
      sub_category_id: sub_category_id || null,
      search: search || "",
    });

    return successResponse(res, "Item report fetched successfully", items);
  } catch (error) {
    console.error("getItemReportItems error:", error);
    return errorResponse(res, "Failed to fetch item report", 500);
  }
};

export const printItemReportItems = async (req, res) => {
  try {
    const { item_type_id, category_id, sub_category_id, search } = req.query;

    const items = await getItemReportItemsModel({
      item_type_id: item_type_id || null,
      category_id: category_id || null,
      sub_category_id: sub_category_id || null,
      search: search || "",
    });

    return successResponse(res, "Item report fetched successfully for print", items);
  } catch (error) {
    console.error("printItemReportItems error:", error);
    return errorResponse(res, "Failed to fetch item report for print", 500);
  }
};

export const printItemReportItemById = async (req, res) => {
  try {
    const itemId = Number(req.params.id);

    if (!Number.isInteger(itemId) || itemId <= 0) {
      return errorResponse(res, "Valid item report id is required", 400);
    }

    const item = await getItemReportItemByIdModel(itemId);

    if (!item) {
      return errorResponse(res, "Item report record not found", 404);
    }

    return successResponse(res, "Item report fetched successfully for print", item);
  } catch (error) {
    console.error("printItemReportItemById error:", error);
    return errorResponse(res, "Failed to fetch item report item for print", 500);
  }
};

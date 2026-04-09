import { getItemReportItemsModel } from "../model/itemReport.model.js";
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
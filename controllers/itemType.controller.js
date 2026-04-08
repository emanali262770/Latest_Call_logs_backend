import {
  createItemTypeModel,
  getItemTypesModel,
  getItemTypeByIdModel,
  getItemTypeByNameModel,
  updateItemTypeModel,
  deleteItemTypeModel,
} from "../model/itemType.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createItemType = async (req, res) => {
  try {
    const { item_type_name, status } = req.body;

    if (!item_type_name?.trim()) {
      return errorResponse(res, "item_type_name is required", 400);
    }

    const existingItemType = await getItemTypeByNameModel(item_type_name);

    if (existingItemType) {
      return errorResponse(res, "Item type already exists", 409);
    }

    const result = await createItemTypeModel({
      item_type_name,
      status,
    });

    return successResponse(
      res,
      "Item type created successfully",
      { item_type_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create item type", 500, error.message);
  }
};

export const getItemTypes = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const itemTypes = await getItemTypesModel(search, status);

    return successResponse(res, "Item types fetched successfully", {
      records: itemTypes.length,
      itemTypes,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch item types", 500, error.message);
  }
};

export const getActiveItemTypes = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const itemTypes = await getItemTypesModel(search, "active");

    return successResponse(res, "Active item types fetched successfully", {
      records: itemTypes.length,
      itemTypes,
    });
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch active item types",
      500,
      error.message
    );
  }
};

export const getItemTypeById = async (req, res) => {
  try {
    const itemType = await getItemTypeByIdModel(req.params.id);

    if (!itemType) {
      return errorResponse(res, "Item type not found", 404);
    }

    return successResponse(res, "Item type fetched successfully", itemType);
  } catch (error) {
    return errorResponse(res, "Failed to fetch item type", 500, error.message);
  }
};

export const updateItemType = async (req, res) => {
  try {
    const itemTypeId = req.params.id;
    const { item_type_name, status } = req.body;

    const itemType = await getItemTypeByIdModel(itemTypeId);

    if (!itemType) {
      return errorResponse(res, "Item type not found", 404);
    }

    const nextItemTypeName = item_type_name?.trim() || itemType.item_type_name;

    const duplicateItemType = await getItemTypeByNameModel(nextItemTypeName);

    if (duplicateItemType && duplicateItemType.id !== Number(itemTypeId)) {
      return errorResponse(res, "Item type already exists", 409);
    }

    await updateItemTypeModel({
      id: itemTypeId,
      item_type_name: nextItemTypeName,
      status: status ?? itemType.status,
    });

    const updatedItemType = await getItemTypeByIdModel(itemTypeId);

    return successResponse(
      res,
      "Item type updated successfully",
      updatedItemType
    );
  } catch (error) {
    return errorResponse(res, "Failed to update item type", 500, error.message);
  }
};

export const deleteItemType = async (req, res) => {
  try {
    const itemTypeId = req.params.id;

    const itemType = await getItemTypeByIdModel(itemTypeId);

    if (!itemType) {
      return errorResponse(res, "Item type not found", 404);
    }

    await deleteItemTypeModel(itemType.id);

    return successResponse(res, "Item type deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete item type", 500, error.message);
  }
};

import {
  createCustomerGroupModel,
  deleteCustomerGroupModel,
  getCustomerGroupByIdModel,
  getCustomerGroupByNameModel,
  getCustomerGroupsModel,
  updateCustomerGroupModel,
} from "../model/customerGroup.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

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

export const createCustomerGroup = async (req, res) => {
  try {
    const groupName = req.body.group_name ?? req.body.groupName ?? req.body.name;

    if (!String(groupName ?? "").trim()) {
      return errorResponse(res, "group_name is required", 400);
    }

    const existing = await getCustomerGroupByNameModel(groupName);
    if (existing) {
      return errorResponse(res, "Customer group already exists", 409);
    }

    const result = await createCustomerGroupModel({
      group_name: groupName,
      status: toNullable(req.body.status) || "active",
    });

    const customerGroup = await getCustomerGroupByIdModel(result.insertId);

    return successResponse(
      res,
      "Customer group created successfully",
      customerGroup,
      201
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to create customer group",
      500,
      error.message
    );
  }
};

export const getCustomerGroups = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;

    const customerGroups = await getCustomerGroupsModel(search, status);

    return successResponse(res, "Customer groups fetched successfully", {
      records: customerGroups.length,
      customerGroups,
    });
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch customer groups",
      500,
      error.message
    );
  }
};

export const getCustomerGroupById = async (req, res) => {
  try {
    const customerGroup = await getCustomerGroupByIdModel(req.params.id);

    if (!customerGroup) {
      return errorResponse(res, "Customer group not found", 404);
    }

    return successResponse(
      res,
      "Customer group fetched successfully",
      customerGroup
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch customer group",
      500,
      error.message
    );
  }
};

export const updateCustomerGroup = async (req, res) => {
  try {
    const customerGroupId = req.params.id;
    const customerGroup = await getCustomerGroupByIdModel(customerGroupId);

    if (!customerGroup) {
      return errorResponse(res, "Customer group not found", 404);
    }

    const nextGroupName =
      toNullable(req.body.group_name ?? req.body.groupName ?? req.body.name) ??
      customerGroup.group_name;

    if (!String(nextGroupName ?? "").trim()) {
      return errorResponse(res, "group_name is required", 400);
    }

    const duplicate = await getCustomerGroupByNameModel(nextGroupName);
    if (duplicate && duplicate.id !== Number(customerGroupId)) {
      return errorResponse(res, "Customer group already exists", 409);
    }

    await updateCustomerGroupModel({
      id: customerGroupId,
      group_name: nextGroupName,
      status: toNullable(req.body.status) || customerGroup.status,
    });

    const updatedCustomerGroup = await getCustomerGroupByIdModel(customerGroupId);

    return successResponse(
      res,
      "Customer group updated successfully",
      updatedCustomerGroup
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to update customer group",
      500,
      error.message
    );
  }
};

export const deleteCustomerGroup = async (req, res) => {
  try {
    const customerGroupId = req.params.id;
    const customerGroup = await getCustomerGroupByIdModel(customerGroupId);

    if (!customerGroup) {
      return errorResponse(res, "Customer group not found", 404);
    }

    await deleteCustomerGroupModel(customerGroupId);

    return successResponse(res, "Customer group deleted successfully");
  } catch (error) {
    return errorResponse(
      res,
      "Failed to delete customer group",
      500,
      error.message
    );
  }
};

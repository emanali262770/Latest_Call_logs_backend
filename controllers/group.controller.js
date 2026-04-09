import {
  createGroupModel,
  deleteGroupModel,
  getAvailableGroupPermissionsModel,
  getGroupByIdModel,
  getGroupPermissionsModel,
  getGroupsModel,
} from "../model/group.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createGroup = async (req, res) => {
  try {
    const { group_name, description, status } = req.body;

    if (!group_name) {
      return errorResponse(res, "group_name is required", 400);
    }

    const result = await createGroupModel({ group_name, description, status });

    return successResponse(res, "Group created successfully", {
      group_id: result.insertId,
    }, 201);
  } catch (error) {
    return errorResponse(res, "Failed to create group", 500, error.message);
  }
};

export const getGroups = async (req, res) => {
  try {
    const groups = await getGroupsModel();
    return successResponse(res, "Groups fetched successfully", groups);
  } catch (error) {
    return errorResponse(res, "Failed to fetch groups", 500, error.message);
  }
};

export const getGroupPermissions = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await getGroupByIdModel(groupId);

    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    const permissions = await getGroupPermissionsModel(groupId);

    return successResponse(
      res,
      "Group permissions fetched successfully",
      {
        group_id: group.id,
        group_name: group.group_name,
        permissions,
      }
    );
  } catch (error) {
    return errorResponse(res, "Failed to fetch group permissions", 500, error.message);
  }
};

export const getAvailableGroupPermissions = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await getGroupByIdModel(groupId);

    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    const permissions = await getAvailableGroupPermissionsModel(groupId);

    return successResponse(
      res,
      "Available group permissions fetched successfully",
      {
        group_id: group.id,
        group_name: group.group_name,
        permissions,
      }
    );
  } catch (error) {
    return errorResponse(
      res,
      "Failed to fetch available group permissions",
      500,
      error.message
    );
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const groupId = req.params.id;
    const group = await getGroupByIdModel(groupId);

    if (!group) {
      return errorResponse(res, "Group not found", 404);
    }

    if (group.group_name?.trim().toLowerCase() === "admin") {
      return errorResponse(res, "Admin group cannot be deleted", 400);
    }

    await deleteGroupModel(groupId);

    return successResponse(res, "Group deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete group", 500, error.message);
  }
};

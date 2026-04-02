import { createGroupModel, getGroupsModel } from "../model/group.model.js";
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
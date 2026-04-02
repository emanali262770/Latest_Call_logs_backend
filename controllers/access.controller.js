import {
  assignPermissionToGroupModel,
  assignGroupToUserModel,
  getUserPermissionsModel,
} from "../model/access.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const assignPermissionToGroup = async (req, res) => {
  try {
    const { group_id, permission_id, permission_ids } = req.body;
    const normalizedPermissionIds = permission_ids ?? permission_id;

    if (!group_id || !normalizedPermissionIds) {
      return errorResponse(
        res,
        "group_id and permission_id or permission_ids are required",
        400
      );
    }

    const ids = Array.isArray(normalizedPermissionIds)
      ? normalizedPermissionIds
      : [normalizedPermissionIds];

    if (ids.length === 0) {
      return errorResponse(
        res,
        "permission_id or permission_ids must contain at least one value",
        400
      );
    }

    const result = await assignPermissionToGroupModel(group_id, ids);

    return successResponse(
      res,
      `${result.assigned} permission(s) assigned to group successfully`,
      {
        group_id,
        permission_ids: ids,
        assigned: result.assigned,
      }
    );
  } catch (error) {
    return errorResponse(res, "Failed to assign permission to group", 500, error.message);
  }
};

export const assignGroupToUser = async (req, res) => {
  try {
    const { user_id, group_id } = req.body;

    if (!user_id || !group_id) {
      return errorResponse(res, "user_id and group_id are required", 400);
    }

    await assignGroupToUserModel(user_id, group_id);

    return successResponse(res, "Group assigned to user successfully", {
      user_id,
      group_id,
    });
  } catch (error) {
    return errorResponse(res, "Failed to assign group to user", 500, error.message);
  }
};

export const getMyPermissions = async (req, res) => {
  try {
    const rows = await getUserPermissionsModel(req.user.id);

    const groupsMap = new Map();

    for (const row of rows) {
      if (!groupsMap.has(row.group_id)) {
        groupsMap.set(row.group_id, {
          group_id: row.group_id,
          group_name: row.group_name,
          permissions: [],
        });
      }

      groupsMap.get(row.group_id).permissions.push({
        permission_id: row.permission_id,
        key_name: row.key_name,
        module: row.module,
        sub_module: row.sub_module,
        action: row.action,
      });
    }

    return successResponse(res, "User permissions fetched successfully", {
      user_id: req.user.id,
      groups: Array.from(groupsMap.values()),
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch user permissions", 500, error.message);
  }
};

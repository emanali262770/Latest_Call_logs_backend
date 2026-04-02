import {
  createPermissionModel,
  getPermissionsModel,
} from "../model/permission.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createPermission = async (req, res) => {
  try {
    const { module, sub_module, action, key_name, description } = req.body;

    if (!module || !sub_module || !action || !key_name) {
      return errorResponse(res, "module, sub_module, action and key_name are required", 400);
    }

    const result = await createPermissionModel({
      module,
      sub_module,
      action,
      key_name,
      description,
    });

    return successResponse(res, "Permission created successfully", {
      permission_id: result.insertId,
    }, 201);
  } catch (error) {
    return errorResponse(res, "Failed to create permission", 500, error.message);
  }
};

export const getPermissions = async (req, res) => {
  try {
    const permissions = await getPermissionsModel();
    return successResponse(res, "Permissions fetched successfully", permissions);
  } catch (error) {
    return errorResponse(res, "Failed to fetch permissions", 500, error.message);
  }
};
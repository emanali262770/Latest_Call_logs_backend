import {
  createDesignationModel,
  getDesignationsModel,
  getDesignationByIdModel,
  getDesignationByNameModel,
  updateDesignationModel,
  deleteDesignationModel,
} from "../model/designation.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createDesignation = async (req, res) => {
  try {
    const { designation_name, status } = req.body;

    if (!designation_name?.trim()) {
      return errorResponse(res, "designation_name is required", 400);
    }

    const existingDesignation = await getDesignationByNameModel(designation_name);

    if (existingDesignation) {
      return errorResponse(res, "Designation already exists", 409);
    }

    const result = await createDesignationModel({
      designation_name,
      status,
    });

    return successResponse(
      res,
      "Designation created successfully",
      { designation_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create designation", 500, error.message);
  }
};

export const getDesignations = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const designations = await getDesignationsModel(search);

    return successResponse(res, "Designations fetched successfully", {
      records: designations.length,
      designations,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch designations", 500, error.message);
  }
};

export const getDesignationById = async (req, res) => {
  try {
    const designation = await getDesignationByIdModel(req.params.id);

    if (!designation) {
      return errorResponse(res, "Designation not found", 404);
    }

    return successResponse(res, "Designation fetched successfully", designation);
  } catch (error) {
    return errorResponse(res, "Failed to fetch designation", 500, error.message);
  }
};

export const updateDesignation = async (req, res) => {
  try {
    const designationId = req.params.id;
    const { designation_name, status } = req.body;

    const designation = await getDesignationByIdModel(designationId);

    if (!designation) {
      return errorResponse(res, "Designation not found", 404);
    }

    const nextDesignationName =
      designation_name?.trim() || designation.designation_name;

    const duplicateDesignation = await getDesignationByNameModel(
      nextDesignationName
    );

    if (duplicateDesignation && duplicateDesignation.id !== Number(designationId)) {
      return errorResponse(res, "Designation already exists", 409);
    }

    await updateDesignationModel({
      id: designationId,
      currentName: designation.designation_name,
      designation_name: nextDesignationName,
      status: status ?? designation.status,
    });

    const updatedDesignation = await getDesignationByIdModel(designationId);

    return successResponse(
      res,
      "Designation updated successfully",
      updatedDesignation
    );
  } catch (error) {
    return errorResponse(res, "Failed to update designation", 500, error.message);
  }
};

export const deleteDesignation = async (req, res) => {
  try {
    const designationId = req.params.id;

    const designation = await getDesignationByIdModel(designationId);

    if (!designation) {
      return errorResponse(res, "Designation not found", 404);
    }

    const result = await deleteDesignationModel(designation);

    if (result.blocked) {
      return errorResponse(
        res,
        `Designation is assigned to ${result.assignedEmployees} employee(s). Reassign them before deleting this designation.`,
        400
      );
    }

    return successResponse(res, "Designation deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete designation", 500, error.message);
  }
};

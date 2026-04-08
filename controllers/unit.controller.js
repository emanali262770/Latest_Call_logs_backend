import {
  createUnitModel,
  getUnitsModel,
  getUnitByIdModel,
  getUnitByNameModel,
  updateUnitModel,
  deleteUnitModel,
} from "../model/unit.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createUnit = async (req, res) => {
  try {
    const { unit_name, short_name, status } = req.body;

    if (!unit_name?.trim()) {
      return errorResponse(res, "unit_name is required", 400);
    }

    if (!short_name?.trim()) {
      return errorResponse(res, "short_name is required", 400);
    }

    const existing = await getUnitByNameModel(unit_name);
    if (existing) {
      return errorResponse(res, "Unit already exists", 409);
    }

    const result = await createUnitModel({
      unit_name,
      short_name,
      status,
    });

    return successResponse(
      res,
      "Unit created successfully",
      { unit_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create unit", 500, error.message);
  }
};

export const getUnits = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const units = await getUnitsModel(search, status);

    return successResponse(res, "Units fetched successfully", {
      records: units.length,
      units,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch units", 500, error.message);
  }
};

export const getUnitById = async (req, res) => {
  try {
    const unit = await getUnitByIdModel(req.params.id);

    if (!unit) {
      return errorResponse(res, "Unit not found", 404);
    }

    return successResponse(res, "Unit fetched successfully", unit);
  } catch (error) {
    return errorResponse(res, "Failed to fetch unit", 500, error.message);
  }
};

export const updateUnit = async (req, res) => {
  try {
    const unitId = req.params.id;
    const { unit_name, short_name, status } = req.body;

    const unit = await getUnitByIdModel(unitId);
    if (!unit) {
      return errorResponse(res, "Unit not found", 404);
    }

    const nextName = unit_name?.trim() || unit.unit_name;

    const duplicate = await getUnitByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(unitId)) {
      return errorResponse(res, "Unit already exists", 409);
    }

    await updateUnitModel({
      id: unitId,
      unit_name: nextName,
      short_name: short_name?.trim() || unit.short_name,
      status: status ?? unit.status,
    });

    const updated = await getUnitByIdModel(unitId);

    return successResponse(res, "Unit updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update unit", 500, error.message);
  }
};

export const deleteUnit = async (req, res) => {
  try {
    const unitId = req.params.id;

    const unit = await getUnitByIdModel(unitId);
    if (!unit) {
      return errorResponse(res, "Unit not found", 404);
    }

    await deleteUnitModel(unit.id);

    return successResponse(res, "Unit deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete unit", 500, error.message);
  }
};

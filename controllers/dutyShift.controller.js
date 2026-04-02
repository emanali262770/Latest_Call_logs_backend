import {
  createDutyShiftModel,
  getDutyShiftsModel,
  getDutyShiftByIdModel,
  getDutyShiftByNameModel,
  updateDutyShiftModel,
  deleteDutyShiftModel,
} from "../model/dutyShift.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createDutyShift = async (req, res) => {
  try {
    const { duty_shift_name, status } = req.body;

    if (!duty_shift_name?.trim()) {
      return errorResponse(res, "duty_shift_name is required", 400);
    }

    const existingDutyShift = await getDutyShiftByNameModel(duty_shift_name);

    if (existingDutyShift) {
      return errorResponse(res, "Duty shift already exists", 409);
    }

    const result = await createDutyShiftModel({
      duty_shift_name,
      status,
    });

    return successResponse(
      res,
      "Duty shift created successfully",
      { duty_shift_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create duty shift", 500, error.message);
  }
};

export const getDutyShifts = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const dutyShifts = await getDutyShiftsModel(search);

    return successResponse(res, "Duty shifts fetched successfully", {
      records: dutyShifts.length,
      duty_shifts: dutyShifts,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch duty shifts", 500, error.message);
  }
};

export const getDutyShiftById = async (req, res) => {
  try {
    const dutyShift = await getDutyShiftByIdModel(req.params.id);

    if (!dutyShift) {
      return errorResponse(res, "Duty shift not found", 404);
    }

    return successResponse(res, "Duty shift fetched successfully", dutyShift);
  } catch (error) {
    return errorResponse(res, "Failed to fetch duty shift", 500, error.message);
  }
};

export const updateDutyShift = async (req, res) => {
  try {
    const dutyShiftId = req.params.id;
    const { duty_shift_name, status } = req.body;

    const dutyShift = await getDutyShiftByIdModel(dutyShiftId);

    if (!dutyShift) {
      return errorResponse(res, "Duty shift not found", 404);
    }

    const nextDutyShiftName = duty_shift_name?.trim() || dutyShift.duty_shift_name;

    const duplicateDutyShift = await getDutyShiftByNameModel(nextDutyShiftName);

    if (duplicateDutyShift && duplicateDutyShift.id !== Number(dutyShiftId)) {
      return errorResponse(res, "Duty shift already exists", 409);
    }

    await updateDutyShiftModel({
      id: dutyShiftId,
      duty_shift_name: nextDutyShiftName,
      status: status ?? dutyShift.status,
    });

    const updatedDutyShift = await getDutyShiftByIdModel(dutyShiftId);

    return successResponse(
      res,
      "Duty shift updated successfully",
      updatedDutyShift
    );
  } catch (error) {
    return errorResponse(res, "Failed to update duty shift", 500, error.message);
  }
};

export const deleteDutyShift = async (req, res) => {
  try {
    const dutyShiftId = req.params.id;

    const dutyShift = await getDutyShiftByIdModel(dutyShiftId);

    if (!dutyShift) {
      return errorResponse(res, "Duty shift not found", 404);
    }

    await deleteDutyShiftModel(dutyShift.id);

    return successResponse(res, "Duty shift deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete duty shift", 500, error.message);
  }
};

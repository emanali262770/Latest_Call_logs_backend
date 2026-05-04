import {
  getFollowUpsModel,
  getFollowUpByIdModel,
  updateFollowUpModel,
  deleteFollowUpModel,
} from "../model/followUp.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const VALID_STATUSES = ["active", "hold", "complete"];

const toNullable = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  return value;
};

const toPositiveIntOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

export const getFollowUps = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const followUps = await getFollowUpsModel(search);
    return successResponse(res, "Follow-ups fetched successfully", {
      records: followUps.length,
      followUps,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch follow-ups", 500, error.message);
  }
};

export const getFollowUpById = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const followUp = await getFollowUpByIdModel(id);
    if (!followUp) return errorResponse(res, "Follow-up not found", 404);

    return successResponse(res, "Follow-up fetched successfully", followUp);
  } catch (error) {
    return errorResponse(res, "Failed to fetch follow-up", 500, error.message);
  }
};

export const updateFollowUp = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const existing = await getFollowUpByIdModel(id);
    if (!existing) return errorResponse(res, "Follow-up not found", 404);

    const status = toNullable(req.body.status);
    if (!status) return errorResponse(res, "status is required", 400);
    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const next_followup_date = toNullable(req.body.nextFollowupDate ?? req.body.next_followup_date);
    const next_followup_time = toNullable(req.body.nextFollowupTime ?? req.body.next_followup_time);
    const customer_remarks   = toNullable(req.body.customerRemarks ?? req.body.customer_remarks);

    await updateFollowUpModel({ id, next_followup_date, next_followup_time, customer_remarks, status });

    const updated = await getFollowUpByIdModel(id);
    return successResponse(res, "Follow-up updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update follow-up", 500, error.message);
  }
};

export const deleteFollowUp = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const existing = await getFollowUpByIdModel(id);
    if (!existing) return errorResponse(res, "Follow-up not found", 404);

    await deleteFollowUpModel(id);
    return successResponse(res, "Follow-up deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete follow-up", 500, error.message);
  }
};

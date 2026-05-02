import {
  getMeetingDetailsModel,
  getMeetingDetailByIdModel,
  updateMeetingDetailModel,
  deleteMeetingDetailModel,
} from "../model/meetingDetail.model.js";
import { getServiceByIdModel } from "../model/service.model.js";
import { getEmployeeByIdModel } from "../model/employee.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const VALID_STATUSES = [
  "follow_up_required",
  "not_interested",
  "already_installed",
  "phone_not_responding",
];

const VALID_ACTIONS = [
  "send_profile",
  "send_quotation",
  "product_information",
  "require_visit_meeting",
];

const VALID_CONTACT_METHODS = ["by_visit", "by_phone", "by_email"];

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

export const getMeetingDetails = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const meetings = await getMeetingDetailsModel(search);
    return successResponse(res, "Meeting details fetched successfully", {
      records: meetings.length,
      meetings,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch meeting details", 500, error.message);
  }
};

export const getMeetingDetailById = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const meeting = await getMeetingDetailByIdModel(id);
    if (!meeting) return errorResponse(res, "Meeting detail not found", 404);

    return successResponse(res, "Meeting detail fetched successfully", meeting);
  } catch (error) {
    return errorResponse(res, "Failed to fetch meeting detail", 500, error.message);
  }
};

export const updateMeetingDetail = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const existing = await getMeetingDetailByIdModel(id);
    if (!existing) return errorResponse(res, "Meeting detail not found", 404);

    const status = toNullable(req.body.status);
    if (!status) return errorResponse(res, "status is required", 400);
    if (!VALID_STATUSES.includes(status)) {
      return errorResponse(res, `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
    }

    const serviceId = toPositiveIntOrNull(req.body.service_id ?? req.body.serviceId);
    if (serviceId !== null) {
      const service = await getServiceByIdModel(serviceId);
      if (!service) return errorResponse(res, "Selected service not found", 404);
    }

    // Follow-up specific fields
    let nextFollowupDate = null;
    let nextFollowupTime = null;
    let nextVisitDetails = null;
    let action = null;
    let referenceProvidedBy = null;
    let referToStaffId = null;
    let contactMethod = null;
    let remarks = null;

    if (status === "follow_up_required") {
      nextFollowupDate = toNullable(req.body.next_followup_date ?? req.body.nextFollowupDate);
      nextFollowupTime = toNullable(req.body.next_followup_time ?? req.body.nextFollowupTime);
      nextVisitDetails = toNullable(req.body.next_visit_details ?? req.body.nextVisitDetails);

      action = toNullable(req.body.action);
      if (action && !VALID_ACTIONS.includes(action)) {
        return errorResponse(res, `action must be one of: ${VALID_ACTIONS.join(", ")}`, 400);
      }

      referenceProvidedBy = toNullable(req.body.reference_provided_by ?? req.body.referenceProvidedBy);

      referToStaffId = toPositiveIntOrNull(req.body.refer_to_staff_id ?? req.body.referToStaffId);
      if (referToStaffId !== null) {
        const staff = await getEmployeeByIdModel(referToStaffId);
        if (!staff) return errorResponse(res, "Selected staff member not found", 404);
      }

      contactMethod = toNullable(req.body.contact_method ?? req.body.contactMethod);
      if (contactMethod && !VALID_CONTACT_METHODS.includes(contactMethod)) {
        return errorResponse(res, `contact_method must be one of: ${VALID_CONTACT_METHODS.join(", ")}`, 400);
      }
    } else {
      remarks = toNullable(req.body.remarks);
    }

    await updateMeetingDetailModel({
      id,
      service_id: serviceId,
      status,
      next_followup_date: nextFollowupDate,
      next_followup_time: nextFollowupTime,
      next_visit_details: nextVisitDetails,
      action,
      reference_provided_by: referenceProvidedBy,
      refer_to_staff_id: referToStaffId,
      contact_method: contactMethod,
      remarks,
    });

    const updated = await getMeetingDetailByIdModel(id);
    return successResponse(res, "Meeting detail updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update meeting detail", 500, error.message);
  }
};

export const deleteMeetingDetail = async (req, res) => {
  try {
    const id = toPositiveIntOrNull(req.params.id);
    if (!id) return errorResponse(res, "id is invalid", 400);

    const existing = await getMeetingDetailByIdModel(id);
    if (!existing) return errorResponse(res, "Meeting detail not found", 404);

    await deleteMeetingDetailModel(id);
    return successResponse(res, "Meeting detail deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete meeting detail", 500, error.message);
  }
};

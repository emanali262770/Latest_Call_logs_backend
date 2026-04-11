import {
  createServiceModel,
  getServicesModel,
  getServiceByIdModel,
  getServiceByNameModel,
  updateServiceModel,
  deleteServiceModel,
} from "../model/service.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createService = async (req, res) => {
  try {
    const { service_name, duration_time, rate, status } = req.body;

    if (!service_name?.trim()) {
      return errorResponse(res, "service_name is required", 400);
    }
    if (!duration_time?.trim()) {
      return errorResponse(res, "duration_time is required", 400);
    }
    if (rate === undefined || rate === null || rate === "") {
      return errorResponse(res, "rate is required", 400);
    }

    const existing = await getServiceByNameModel(service_name);
    if (existing) {
      return errorResponse(res, "Service already exists", 409);
    }

    const result = await createServiceModel({ service_name, duration_time, rate, status });

    return successResponse(res, "Service created successfully", { service_id: result.insertId }, 201);
  } catch (error) {
    return errorResponse(res, "Failed to create service", 500, error.message);
  }
};

export const getServices = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;

    const services = await getServicesModel(search, status);

    return successResponse(res, "Services fetched successfully", {
      records: services.length,
      services,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch services", 500, error.message);
  }
};

export const getActiveServices = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const services = await getServicesModel(search, "active");

    return successResponse(res, "Active services fetched successfully", {
      records: services.length,
      services,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch active services", 500, error.message);
  }
};

export const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await getServiceByIdModel(id);

    if (!service) {
      return errorResponse(res, "Service not found", 404);
    }

    return successResponse(res, "Service fetched successfully", { service });
  } catch (error) {
    return errorResponse(res, "Failed to fetch service", 500, error.message);
  }
};

export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { service_name, duration_time, rate, status } = req.body;

    if (!service_name?.trim()) {
      return errorResponse(res, "service_name is required", 400);
    }
    if (!duration_time?.trim()) {
      return errorResponse(res, "duration_time is required", 400);
    }
    if (rate === undefined || rate === null || rate === "") {
      return errorResponse(res, "rate is required", 400);
    }

    const existing = await getServiceByIdModel(id);
    if (!existing) {
      return errorResponse(res, "Service not found", 404);
    }

    const duplicate = await getServiceByNameModel(service_name);
    if (duplicate && duplicate.id != id) {
      return errorResponse(res, "Service name already in use", 409);
    }

    await updateServiceModel({ id, service_name, duration_time, rate, status });

    return successResponse(res, "Service updated successfully");
  } catch (error) {
    return errorResponse(res, "Failed to update service", 500, error.message);
  }
};

export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getServiceByIdModel(id);
    if (!existing) {
      return errorResponse(res, "Service not found", 404);
    }

    await deleteServiceModel(id);

    return successResponse(res, "Service deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete service", 500, error.message);
  }
};

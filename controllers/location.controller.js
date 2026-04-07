import {
  createLocationModel,
  getLocationsModel,
  getLocationByIdModel,
  getLocationByNameModel,
  updateLocationModel,
  deleteLocationModel,
} from "../model/location.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createLocation = async (req, res) => {
  try {
    const { location_name, address, status } = req.body;

    if (!location_name?.trim()) {
      return errorResponse(res, "location_name is required", 400);
    }

    if (!address?.trim()) {
      return errorResponse(res, "address is required", 400);
    }

    const existing = await getLocationByNameModel(location_name);
    if (existing) {
      return errorResponse(res, "Location already exists", 409);
    }

    const result = await createLocationModel({
      location_name,
      address,
      status,
    });

    return successResponse(
      res,
      "Location created successfully",
      { location_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create location", 500, error.message);
  }
};

export const getLocations = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const locations = await getLocationsModel(search);

    return successResponse(res, "Locations fetched successfully", {
      records: locations.length,
      locations,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch locations", 500, error.message);
  }
};

export const getLocationById = async (req, res) => {
  try {
    const location = await getLocationByIdModel(req.params.id);

    if (!location) {
      return errorResponse(res, "Location not found", 404);
    }

    return successResponse(res, "Location fetched successfully", location);
  } catch (error) {
    return errorResponse(res, "Failed to fetch location", 500, error.message);
  }
};

export const updateLocation = async (req, res) => {
  try {
    const locationId = req.params.id;
    const { location_name, address, status } = req.body;

    const location = await getLocationByIdModel(locationId);
    if (!location) {
      return errorResponse(res, "Location not found", 404);
    }

    const nextName = location_name?.trim() || location.location_name;

    const duplicate = await getLocationByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(locationId)) {
      return errorResponse(res, "Location already exists", 409);
    }

    await updateLocationModel({
      id: locationId,
      location_name: nextName,
      address: address?.trim() || location.address,
      status: status ?? location.status,
    });

    const updated = await getLocationByIdModel(locationId);

    return successResponse(res, "Location updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update location", 500, error.message);
  }
};

export const deleteLocation = async (req, res) => {
  try {
    const locationId = req.params.id;

    const location = await getLocationByIdModel(locationId);
    if (!location) {
      return errorResponse(res, "Location not found", 404);
    }

    await deleteLocationModel(location.id);

    return successResponse(res, "Location deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete location", 500, error.message);
  }
};

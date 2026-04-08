import {
  createManufacturerModel,
  getManufacturersModel,
  getManufacturerByIdModel,
  getManufacturerByNameModel,
  updateManufacturerModel,
  deleteManufacturerModel,
} from "../model/manufacturer.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createManufacturer = async (req, res) => {
  try {
    const { manufacturer_name, phone, address, status } = req.body;

    if (!manufacturer_name?.trim()) {
      return errorResponse(res, "manufacturer_name is required", 400);
    }

    const existing = await getManufacturerByNameModel(manufacturer_name);
    if (existing) {
      return errorResponse(res, "Manufacturer already exists", 409);
    }

    const result = await createManufacturerModel({
      manufacturer_name,
      phone,
      address,
      status,
    });

    return successResponse(
      res,
      "Manufacturer created successfully",
      { manufacturer_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create manufacturer", 500, error.message);
  }
};

export const getManufacturers = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const manufacturers = await getManufacturersModel(search, status);

    return successResponse(res, "Manufacturers fetched successfully", {
      records: manufacturers.length,
      manufacturers,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch manufacturers", 500, error.message);
  }
};

export const getManufacturerById = async (req, res) => {
  try {
    const manufacturer = await getManufacturerByIdModel(req.params.id);

    if (!manufacturer) {
      return errorResponse(res, "Manufacturer not found", 404);
    }

    return successResponse(res, "Manufacturer fetched successfully", manufacturer);
  } catch (error) {
    return errorResponse(res, "Failed to fetch manufacturer", 500, error.message);
  }
};

export const updateManufacturer = async (req, res) => {
  try {
    const manufacturerId = req.params.id;
    const { manufacturer_name, phone, address, status } = req.body;

    const manufacturer = await getManufacturerByIdModel(manufacturerId);
    if (!manufacturer) {
      return errorResponse(res, "Manufacturer not found", 404);
    }

    const nextName = manufacturer_name?.trim() || manufacturer.manufacturer_name;

    const duplicate = await getManufacturerByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(manufacturerId)) {
      return errorResponse(res, "Manufacturer already exists", 409);
    }

    await updateManufacturerModel({
      id: manufacturerId,
      manufacturer_name: nextName,
      phone: phone !== undefined ? (phone || null) : manufacturer.phone,
      address: address !== undefined ? (address || null) : manufacturer.address,
      status: status ?? manufacturer.status,
    });

    const updated = await getManufacturerByIdModel(manufacturerId);

    return successResponse(res, "Manufacturer updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update manufacturer", 500, error.message);
  }
};

export const deleteManufacturer = async (req, res) => {
  try {
    const manufacturerId = req.params.id;

    const manufacturer = await getManufacturerByIdModel(manufacturerId);
    if (!manufacturer) {
      return errorResponse(res, "Manufacturer not found", 404);
    }

    await deleteManufacturerModel(manufacturer.id);

    return successResponse(res, "Manufacturer deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete manufacturer", 500, error.message);
  }
};

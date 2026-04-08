import {
  createSupplierModel,
  getSuppliersModel,
  getSupplierByIdModel,
  getSupplierByNameModel,
  updateSupplierModel,
  deleteSupplierModel,
} from "../model/supplier.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createSupplier = async (req, res) => {
  try {
    const { name, phone, address, status } = req.body;

    if (!name?.trim()) {
      return errorResponse(res, "name is required", 400);
    }

    const existing = await getSupplierByNameModel(name);
    if (existing) {
      return errorResponse(res, "Supplier already exists", 409);
    }

    const result = await createSupplierModel({
      supplier_name: name,
      phone,
      address,
      status,
    });

    return successResponse(
      res,
      "Supplier created successfully",
      { supplier_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create supplier", 500, error.message);
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const suppliers = await getSuppliersModel(search, status);

    return successResponse(res, "Suppliers fetched successfully", {
      records: suppliers.length,
      suppliers,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch suppliers", 500, error.message);
  }
};

export const getSupplierById = async (req, res) => {
  try {
    const supplier = await getSupplierByIdModel(req.params.id);

    if (!supplier) {
      return errorResponse(res, "Supplier not found", 404);
    }

    return successResponse(res, "Supplier fetched successfully", supplier);
  } catch (error) {
    return errorResponse(res, "Failed to fetch supplier", 500, error.message);
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;
    const { name, phone, address, status } = req.body;

    const supplier = await getSupplierByIdModel(supplierId);
    if (!supplier) {
      return errorResponse(res, "Supplier not found", 404);
    }

    const nextName = name?.trim() || supplier.name;

    const duplicate = await getSupplierByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(supplierId)) {
      return errorResponse(res, "Supplier already exists", 409);
    }

    await updateSupplierModel({
      id: supplierId,
      supplier_name: nextName,
      phone: phone !== undefined ? (phone || null) : supplier.phone,
      address: address !== undefined ? (address || null) : supplier.address,
      status: status ?? supplier.status,
    });

    const updated = await getSupplierByIdModel(supplierId);

    return successResponse(res, "Supplier updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update supplier", 500, error.message);
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const supplierId = req.params.id;

    const supplier = await getSupplierByIdModel(supplierId);
    if (!supplier) {
      return errorResponse(res, "Supplier not found", 404);
    }

    await deleteSupplierModel(supplier.id);

    return successResponse(res, "Supplier deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete supplier", 500, error.message);
  }
};

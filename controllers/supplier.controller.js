import {
  createSupplierModel,
  generateSupplierCodeModel,
  getSuppliersModel,
  getSupplierByIdModel,
  getSupplierByNameModel,
  updateSupplierModel,
  deleteSupplierModel,
} from "../model/supplier.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const toNullable = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue === "" ? null : trimmedValue;
  }

  return value;
};

const toOpeningBalance = (value) => {
  if (value === undefined || value === null || value === "") {
    return 0;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const pickBodyValue = (body, keys) => {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      return body[key];
    }
  }

  return undefined;
};

export const createSupplier = async (req, res) => {
  try {
    const supplierName = req.body.supplier_name ?? req.body.name;
    const contactPerson = pickBodyValue(req.body, ["contact_person", "contactPerson"]);
    const city = pickBodyValue(req.body, ["city"]);
    const mobileNumber = pickBodyValue(req.body, ["mobile_number", "mobileNumber", "mobile"]);
    const phoneNumber = pickBodyValue(req.body, ["phone", "phone_number", "phoneNumber"]);
    const openingBalance = toOpeningBalance(req.body.opening_balance);

    if (!supplierName?.trim()) {
      return errorResponse(res, "supplier_name is required", 400);
    }

    if (!toNullable(contactPerson)) {
      return errorResponse(res, "contact_person is required", 400);
    }

    if (!toNullable(city)) {
      return errorResponse(res, "city is required", 400);
    }

    if (!toNullable(phoneNumber)) {
      return errorResponse(res, "phone is required", 400);
    }

    if (openingBalance === null) {
      return errorResponse(res, "opening_balance must be a valid number", 400);
    }

    const existing = await getSupplierByNameModel(supplierName);
    if (existing) {
      return errorResponse(res, "Supplier already exists", 409);
    }

    const supplierCode =
      toNullable(req.body.supplier_code) ?? (await generateSupplierCodeModel());

    const result = await createSupplierModel({
      supplier_code: supplierCode,
      supplier_name: supplierName,
      contact_person: toNullable(contactPerson),
      city: toNullable(city),
      mobile_number: toNullable(mobileNumber),
      phone: toNullable(phoneNumber),
      email: toNullable(req.body.email),
      address: toNullable(req.body.address),
      opening_balance: openingBalance,
      ob_date: toNullable(req.body.ob_date),
      status: req.body.status ?? "active",
    });

    const createdSupplier = await getSupplierByIdModel(result.insertId);

    return successResponse(
      res,
      "Supplier created successfully",
      createdSupplier,
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
    const supplierName = req.body.supplier_name ?? req.body.name;
    const contactPerson = pickBodyValue(req.body, ["contact_person", "contactPerson"]);
    const city = pickBodyValue(req.body, ["city"]);
    const mobileNumber = pickBodyValue(req.body, ["mobile_number", "mobileNumber", "mobile"]);
    const phoneNumber = pickBodyValue(req.body, ["phone", "phone_number", "phoneNumber"]);

    const supplier = await getSupplierByIdModel(supplierId);
    if (!supplier) {
      return errorResponse(res, "Supplier not found", 404);
    }

    const nextName = supplierName?.trim() || supplier.supplier_name;
    const nextContactPerson =
      contactPerson !== undefined
        ? toNullable(contactPerson)
        : supplier.contact_person;
    const nextCity = city !== undefined ? toNullable(city) : supplier.city;
    const nextPhone = phoneNumber !== undefined ? toNullable(phoneNumber) : supplier.phone;

    const duplicate = await getSupplierByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(supplierId)) {
      return errorResponse(res, "Supplier already exists", 409);
    }

    if (!nextContactPerson) {
      return errorResponse(res, "contact_person is required", 400);
    }

    if (!nextCity) {
      return errorResponse(res, "city is required", 400);
    }

    if (!nextPhone) {
      return errorResponse(res, "phone is required", 400);
    }

    const nextOpeningBalance = Object.prototype.hasOwnProperty.call(req.body, "opening_balance")
      ? toOpeningBalance(req.body.opening_balance)
      : Number(supplier.opening_balance ?? 0);

    if (nextOpeningBalance === null) {
      return errorResponse(res, "opening_balance must be a valid number", 400);
    }

    await updateSupplierModel({
      id: supplierId,
      supplier_code: toNullable(req.body.supplier_code) ?? supplier.supplier_code,
      supplier_name: nextName,
      contact_person: nextContactPerson,
      city: nextCity,
      mobile_number:
        mobileNumber !== undefined
          ? toNullable(mobileNumber)
          : supplier.mobile_number,
      phone: nextPhone,
      email: req.body.email !== undefined ? toNullable(req.body.email) : supplier.email,
      address: req.body.address !== undefined ? toNullable(req.body.address) : supplier.address,
      opening_balance: nextOpeningBalance,
      ob_date: req.body.ob_date !== undefined ? toNullable(req.body.ob_date) : supplier.ob_date,
      status: req.body.status ?? supplier.status,
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

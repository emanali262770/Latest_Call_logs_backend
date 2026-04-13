import {
  createCustomerModel,
  deleteCustomerModel,
  generateCustomerCodeModel,
  getCustomerByIdModel,
  getCustomerByNameModel,
  getCustomersModel,
  updateCustomerModel,
} from "../model/customer.model.js";
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

export const createCustomer = async (req, res) => {
  try {
    const customerName = req.body.customer_name ?? req.body.name;
    const phone = req.body.phone;
    const openingBalance = toOpeningBalance(
      req.body.opening_balance ?? req.body.openingBalance
    );

    if (!customerName?.trim()) {
      return errorResponse(res, "customer_name is required", 400);
    }

    if (!String(phone ?? "").trim()) {
      return errorResponse(res, "phone is required", 400);
    }

    if (openingBalance === null) {
      return errorResponse(res, "opening_balance must be a valid number", 400);
    }

    const existing = await getCustomerByNameModel(customerName);
    if (existing) {
      return errorResponse(res, "Customer already exists", 409);
    }

    const customerCode =
      toNullable(req.body.customer_code ?? req.body.code) ??
      (await generateCustomerCodeModel());

    const result = await createCustomerModel({
      customer_code: customerCode,
      customer_name: customerName,
      phone: toNullable(phone),
      email: toNullable(req.body.email),
      address: toNullable(req.body.address),
      opening_balance: openingBalance,
      ob_date: toNullable(req.body.ob_date ?? req.body.obDate),
      status: req.body.status ?? "active",
    });

    const createdCustomer = await getCustomerByIdModel(result.insertId);

    return successResponse(res, "Customer created successfully", createdCustomer, 201);
  } catch (error) {
    return errorResponse(res, "Failed to create customer", 500, error.message);
  }
};

export const getCustomers = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;

    const customers = await getCustomersModel(search, status);

    return successResponse(res, "Customers fetched successfully", {
      records: customers.length,
      customers,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch customers", 500, error.message);
  }
};

export const getCustomerById = async (req, res) => {
  try {
    const customer = await getCustomerByIdModel(req.params.id);

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    return successResponse(res, "Customer fetched successfully", customer);
  } catch (error) {
    return errorResponse(res, "Failed to fetch customer", 500, error.message);
  }
};

export const updateCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customerName = req.body.customer_name ?? req.body.name;
    const customer = await getCustomerByIdModel(customerId);

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const nextName = customerName?.trim() || customer.customer_name;
    const duplicate = await getCustomerByNameModel(nextName);
    if (duplicate && duplicate.id !== Number(customerId)) {
      return errorResponse(res, "Customer already exists", 409);
    }

    const nextOpeningBalance = Object.prototype.hasOwnProperty.call(req.body, "opening_balance")
      || Object.prototype.hasOwnProperty.call(req.body, "openingBalance")
      ? toOpeningBalance(req.body.opening_balance ?? req.body.openingBalance)
      : Number(customer.opening_balance ?? 0);

    if (nextOpeningBalance === null) {
      return errorResponse(res, "opening_balance must be a valid number", 400);
    }

    await updateCustomerModel({
      id: customerId,
      customer_code: toNullable(req.body.customer_code ?? req.body.code) ?? customer.customer_code,
      customer_name: nextName,
      phone: req.body.phone !== undefined ? toNullable(req.body.phone) : customer.phone,
      email: req.body.email !== undefined ? toNullable(req.body.email) : customer.email,
      address: req.body.address !== undefined ? toNullable(req.body.address) : customer.address,
      opening_balance: nextOpeningBalance,
      ob_date:
        req.body.ob_date !== undefined || req.body.obDate !== undefined
          ? toNullable(req.body.ob_date ?? req.body.obDate)
          : customer.ob_date,
      status: req.body.status ?? customer.status,
    });

    const updatedCustomer = await getCustomerByIdModel(customerId);

    return successResponse(res, "Customer updated successfully", updatedCustomer);
  } catch (error) {
    return errorResponse(res, "Failed to update customer", 500, error.message);
  }
};

export const deleteCustomer = async (req, res) => {
  try {
    const customerId = req.params.id;
    const customer = await getCustomerByIdModel(customerId);

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    await deleteCustomerModel(customer.id);

    return successResponse(res, "Customer deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete customer", 500, error.message);
  }
};

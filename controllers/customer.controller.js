import {
  createCustomerModel,
  deleteCustomerModel,
  getCustomerByIdModel,
  getCustomerByCompanyModel,
  getCustomerByPersonAndMobileModel,
  getCustomersModel,
  updateCustomerModel,
} from "../model/customer.model.js";
import { getCustomerGroupByIdModel } from "../model/customerGroup.model.js";
import { createMeetingDetailModel } from "../model/meetingDetail.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const hasOwn = (object, key) =>
  Object.prototype.hasOwnProperty.call(object || {}, key);

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

const toNumberOrNull = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : Number.NaN;
};

const validateCustomerGroup = async (groupId) => {
  if (groupId === null) {
    return { group: null };
  }

  if (Number.isNaN(groupId)) {
    return { error: "customer_group_id is invalid" };
  }

  const group = await getCustomerGroupByIdModel(groupId);
  if (!group || group.status === "inactive") {
    return { error: "Selected customer group not found" };
  }

  return { group };
};

export const createCustomer = async (req, res) => {
  try {
    const company = toNullable(req.body.company);
    const person = toNullable(req.body.person);
    const designation = toNullable(req.body.designation);
    const department = toNullable(req.body.department);
    const mobile = toNullable(req.body.mobile);
    const whatsappNo = toNullable(req.body.whatsapp_no ?? req.body.whatsappNo);
    const customerGroupId = toNumberOrNull(
      req.body.customer_group_id ?? req.body.customerGroupId ?? req.body.group_id ?? req.body.groupId
    );

    if (!person) {
      return errorResponse(res, "person is required", 400);
    }

    if (!company) {
      return errorResponse(res, "company is required", 400);
    }

    if (!mobile) {
      return errorResponse(res, "mobile is required", 400);
    }

    if (!whatsappNo) {
      return errorResponse(res, "whatsapp_no is required", 400);
    }

    if (!designation) {
      return errorResponse(res, "designation is required", 400);
    }

    if (!department) {
      return errorResponse(res, "department is required", 400);
    }

    if (company) {
      const existingCompany = await getCustomerByCompanyModel(company);
      if (existingCompany) {
        return errorResponse(res, "Company already exists", 409);
      }
    }

    const customerGroupCheck = await validateCustomerGroup(customerGroupId);
    if (customerGroupCheck.error) {
      return errorResponse(res, customerGroupCheck.error, 400);
    }

    const existing = await getCustomerByPersonAndMobileModel(person, mobile);
    if (existing) {
      return errorResponse(res, "Customer already exists", 409);
    }

    const result = await createCustomerModel({
      customer_group_id: customerGroupId,
      company,
      person,
      designation,
      department,
      office_address: toNullable(req.body.office_address ?? req.body.officeAddress),
      office_phone: toNullable(req.body.office_phone ?? req.body.officePhone),
      fax: toNullable(req.body.fax),
      residence_address: toNullable(req.body.residence_address ?? req.body.residenceAddress),
      residence_phone: toNullable(req.body.residence_phone ?? req.body.residencePhone),
      mobile,
      whatsapp_no: whatsappNo,
      email: toNullable(req.body.email),
      website: toNullable(req.body.website),
      description: toNullable(req.body.description),
      status: req.body.status ?? "active",
    });

    const createdCustomer = await getCustomerByIdModel(result.insertId);

    // Auto-create a meeting detail entry for the new customer
    await createMeetingDetailModel({ customer_id: result.insertId });

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
    const customer = await getCustomerByIdModel(customerId);

    if (!customer) {
      return errorResponse(res, "Customer not found", 404);
    }

    const nextPerson = hasOwn(req.body, "person")
      ? toNullable(req.body.person)
      : customer.person;
    const nextCompany = hasOwn(req.body, "company")
      ? toNullable(req.body.company)
      : customer.company;
    const nextDesignation = hasOwn(req.body, "designation")
      ? toNullable(req.body.designation)
      : customer.designation;
    const nextDepartment = hasOwn(req.body, "department")
      ? toNullable(req.body.department)
      : customer.department;
    const nextMobile = hasOwn(req.body, "mobile")
      ? toNullable(req.body.mobile)
      : customer.mobile;
    const nextWhatsappNo =
      hasOwn(req.body, "whatsapp_no") || hasOwn(req.body, "whatsappNo")
        ? toNullable(req.body.whatsapp_no ?? req.body.whatsappNo)
        : (customer.whatsapp_no ?? customer.whatsappNo);

    if (!nextPerson) {
      return errorResponse(res, "person is required", 400);
    }

    if (!nextCompany) {
      return errorResponse(res, "company is required", 400);
    }

    if (!nextMobile) {
      return errorResponse(res, "mobile is required", 400);
    }

    if (!nextWhatsappNo) {
      return errorResponse(res, "whatsapp_no is required", 400);
    }

    if (!nextDesignation) {
      return errorResponse(res, "designation is required", 400);
    }

    if (!nextDepartment) {
      return errorResponse(res, "department is required", 400);
    }

    if (nextCompany) {
      const existingCompany = await getCustomerByCompanyModel(nextCompany);
      if (existingCompany && existingCompany.id !== Number(customerId)) {
        return errorResponse(res, "Company already exists", 409);
      }
    }

    const nextCustomerGroupId =
      hasOwn(req.body, "customer_group_id") ||
      hasOwn(req.body, "customerGroupId") ||
      hasOwn(req.body, "group_id") ||
      hasOwn(req.body, "groupId")
        ? toNumberOrNull(
            req.body.customer_group_id ??
              req.body.customerGroupId ??
              req.body.group_id ??
              req.body.groupId
          )
        : (customer.customer_group_id ?? customer.customerGroupId ?? null);

    const customerGroupCheck = await validateCustomerGroup(nextCustomerGroupId);
    if (customerGroupCheck.error) {
      return errorResponse(res, customerGroupCheck.error, 400);
    }

    const duplicate = await getCustomerByPersonAndMobileModel(nextPerson, nextMobile);
    if (duplicate && duplicate.id !== Number(customerId)) {
      return errorResponse(res, "Customer already exists", 409);
    }

    await updateCustomerModel({
      id: customerId,
      customer_group_id: nextCustomerGroupId,
      company: nextCompany,
      person: nextPerson,
      designation: nextDesignation,
      department: nextDepartment,
      office_address:
        hasOwn(req.body, "office_address") || hasOwn(req.body, "officeAddress")
          ? toNullable(req.body.office_address ?? req.body.officeAddress)
          : (customer.office_address ?? customer.officeAddress),
      office_phone:
        hasOwn(req.body, "office_phone") || hasOwn(req.body, "officePhone")
          ? toNullable(req.body.office_phone ?? req.body.officePhone)
          : (customer.office_phone ?? customer.officePhone),
      fax: hasOwn(req.body, "fax") ? toNullable(req.body.fax) : customer.fax,
      residence_address:
        hasOwn(req.body, "residence_address") || hasOwn(req.body, "residenceAddress")
          ? toNullable(req.body.residence_address ?? req.body.residenceAddress)
          : (customer.residence_address ?? customer.residenceAddress),
      residence_phone:
        hasOwn(req.body, "residence_phone") || hasOwn(req.body, "residencePhone")
          ? toNullable(req.body.residence_phone ?? req.body.residencePhone)
          : (customer.residence_phone ?? customer.residencePhone),
      mobile: nextMobile,
      whatsapp_no: nextWhatsappNo,
      email: hasOwn(req.body, "email") ? toNullable(req.body.email) : customer.email,
      website: hasOwn(req.body, "website") ? toNullable(req.body.website) : customer.website,
      description:
        hasOwn(req.body, "description") ? toNullable(req.body.description) : customer.description,
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

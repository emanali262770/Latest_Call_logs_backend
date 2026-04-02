import {
  createEmployeeTypeModel,
  getEmployeeTypesModel,
  getEmployeeTypeByIdModel,
  getEmployeeTypeByNameModel,
  updateEmployeeTypeModel,
  deleteEmployeeTypeModel,
} from "../model/employeeType.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createEmployeeType = async (req, res) => {
  try {
    const { employee_type_name, status } = req.body;

    if (!employee_type_name?.trim()) {
      return errorResponse(res, "employee_type_name is required", 400);
    }

    const existingEmployeeType = await getEmployeeTypeByNameModel(employee_type_name);

    if (existingEmployeeType) {
      return errorResponse(res, "Employee type already exists", 409);
    }

    const result = await createEmployeeTypeModel({
      employee_type_name,
      status,
    });

    return successResponse(
      res,
      "Employee type created successfully",
      { employee_type_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create employee type", 500, error.message);
  }
};

export const getEmployeeTypes = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const employeeTypes = await getEmployeeTypesModel(search);

    return successResponse(res, "Employee types fetched successfully", {
      records: employeeTypes.length,
      employee_types: employeeTypes,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch employee types", 500, error.message);
  }
};

export const getEmployeeTypeById = async (req, res) => {
  try {
    const employeeType = await getEmployeeTypeByIdModel(req.params.id);

    if (!employeeType) {
      return errorResponse(res, "Employee type not found", 404);
    }

    return successResponse(res, "Employee type fetched successfully", employeeType);
  } catch (error) {
    return errorResponse(res, "Failed to fetch employee type", 500, error.message);
  }
};

export const updateEmployeeType = async (req, res) => {
  try {
    const employeeTypeId = req.params.id;
    const { employee_type_name, status } = req.body;

    const employeeType = await getEmployeeTypeByIdModel(employeeTypeId);

    if (!employeeType) {
      return errorResponse(res, "Employee type not found", 404);
    }

    const nextEmployeeTypeName =
      employee_type_name?.trim() || employeeType.employee_type_name;

    const duplicateEmployeeType = await getEmployeeTypeByNameModel(
      nextEmployeeTypeName
    );

    if (duplicateEmployeeType && duplicateEmployeeType.id !== Number(employeeTypeId)) {
      return errorResponse(res, "Employee type already exists", 409);
    }

    await updateEmployeeTypeModel({
      id: employeeTypeId,
      employee_type_name: nextEmployeeTypeName,
      status: status ?? employeeType.status,
    });

    const updatedEmployeeType = await getEmployeeTypeByIdModel(employeeTypeId);

    return successResponse(
      res,
      "Employee type updated successfully",
      updatedEmployeeType
    );
  } catch (error) {
    return errorResponse(res, "Failed to update employee type", 500, error.message);
  }
};

export const deleteEmployeeType = async (req, res) => {
  try {
    const employeeTypeId = req.params.id;

    const employeeType = await getEmployeeTypeByIdModel(employeeTypeId);

    if (!employeeType) {
      return errorResponse(res, "Employee type not found", 404);
    }

    await deleteEmployeeTypeModel(employeeType.id);

    return successResponse(res, "Employee type deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete employee type", 500, error.message);
  }
};

import {
  createDepartmentModel,
  getDepartmentsModel,
  getDepartmentByIdModel,
  getDepartmentByNameModel,
  updateDepartmentModel,
  deleteDepartmentModel,
} from "../model/department.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createDepartment = async (req, res) => {
  try {
    const { department_name, status } = req.body;

    if (!department_name?.trim()) {
      return errorResponse(res, "department_name is required", 400);
    }

    const existingDepartment = await getDepartmentByNameModel(department_name);

    if (existingDepartment) {
      return errorResponse(res, "Department already exists", 409);
    }

    const result = await createDepartmentModel({
      department_name,
      status,
    });

    return successResponse(
      res,
      "Department created successfully",
      { department_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create department", 500, error.message);
  }
};

export const getDepartments = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const departments = await getDepartmentsModel(search);

    return successResponse(res, "Departments fetched successfully", {
      records: departments.length,
      departments,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch departments", 500, error.message);
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const department = await getDepartmentByIdModel(req.params.id);

    if (!department) {
      return errorResponse(res, "Department not found", 404);
    }

    return successResponse(res, "Department fetched successfully", department);
  } catch (error) {
    return errorResponse(res, "Failed to fetch department", 500, error.message);
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;
    const { department_name, status } = req.body;

    const department = await getDepartmentByIdModel(departmentId);

    if (!department) {
      return errorResponse(res, "Department not found", 404);
    }

    const nextDepartmentName = department_name?.trim() || department.department_name;

    const duplicateDepartment = await getDepartmentByNameModel(nextDepartmentName);

    if (duplicateDepartment && duplicateDepartment.id !== Number(departmentId)) {
      return errorResponse(res, "Department already exists", 409);
    }

    await updateDepartmentModel({
      id: departmentId,
      currentName: department.department_name,
      department_name: nextDepartmentName,
      status: status ?? department.status,
    });

    const updatedDepartment = await getDepartmentByIdModel(departmentId);

    return successResponse(
      res,
      "Department updated successfully",
      updatedDepartment
    );
  } catch (error) {
    return errorResponse(res, "Failed to update department", 500, error.message);
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const departmentId = req.params.id;

    const department = await getDepartmentByIdModel(departmentId);

    if (!department) {
      return errorResponse(res, "Department not found", 404);
    }

    const result = await deleteDepartmentModel(department);

    if (result.blocked) {
      return errorResponse(
        res,
        `Department is assigned to ${result.assignedEmployees} employee(s). Reassign them before deleting this department.`,
        400
      );
    }

    return successResponse(res, "Department deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete department", 500, error.message);
  }
};

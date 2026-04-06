import {
  createEmployeeModel,
  generateEmployeeCodeModel,
  getEmployeeByDesignationModel,
  getEmployeesModel,
  getEmployeeByEmpIdModel,
  getEmployeeByIdModel,
  getEmployeeByNameModel,
  updateEmployeeModel,
} from "../model/employee.model.js";
import { getDepartmentByNameModel } from "../model/department.model.js";
import { getDesignationByNameModel } from "../model/designation.model.js";
import { getEmployeeTypeByNameModel } from "../model/employeeType.model.js";
import { getDutyShiftByNameModel } from "../model/dutyShift.model.js";
import { getBankByNameModel } from "../model/bank.model.js";
import { db } from "../config/db.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { removeLocalFile, toPublicUploadUrl } from "../utils/localFiles.js";

const normalizeEmployee = (employee) => ({
  ...employee,
  employee_name: employee.employee_name || employee.first_name,
});

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

const getMissingRequiredEmployeeField = (fields) => {
  const requiredFields = [
    ["employee_name", fields.employee_name],
    ["address", fields.address],
    ["city", fields.city],
    ["sex", fields.sex],
    ["phone", fields.phone],
    ["email", fields.email],
    ["cnic_no", fields.cnic_no],
    ["department", fields.department],
    ["designation", fields.designation],
    ["employee_type", fields.employee_type],
    ["duty_shift", fields.duty_shift],
    ["bank", fields.bank],
    ["account_number", fields.account_number],
  ];

  for (const [fieldName, fieldValue] of requiredFields) {
    if (typeof fieldValue === "string") {
      if (!fieldValue.trim()) {
        return fieldName;
      }
      continue;
    }

    if (fieldValue === undefined || fieldValue === null) {
      return fieldName;
    }
  }

  return null;
};

const SUPER_ADMIN_DESIGNATION = "super admin";

const hasSuperAdminDesignation = (designation) =>
  typeof designation === "string" &&
  designation.trim().toLowerCase() === SUPER_ADMIN_DESIGNATION;

const ensureSingleSuperAdminDesignation = async (designation, currentEmployeeId = null) => {
  if (!hasSuperAdminDesignation(designation)) {
    return null;
  }

  const existingSuperAdmin = await getEmployeeByDesignationModel(designation);

  if (
    existingSuperAdmin &&
    existingSuperAdmin.id !== Number(currentEmployeeId)
  ) {
    return "Admin already exists with designation of Super Admin";
  }

  return null;
};

export const createEmployee = async (req, res) => {
  try {
    const uploadedProfileImage = toPublicUploadUrl(req.file?.path);
    const {
      emp_id,
      employee_name,
      profile_image,
      father_name,
      address,
      city,
      sex,
      email,
      phone,
      mobile,
      cnic_no,
      date_of_birth,
      qualification,
      blood_group,
      designation,
      department,
      employee_type,
      hiring_date,
      duty_shift,
      bank,
      account_number,
      status,
      enabled,
    } = req.body;

    const missingRequiredField = getMissingRequiredEmployeeField({
      employee_name,
      address,
      city,
      sex,
      phone,
      email,
      cnic_no,
      department,
      designation,
      employee_type,
      duty_shift,
      bank,
      account_number,
    });

    if (missingRequiredField) {
      return errorResponse(res, `${missingRequiredField} is required`, 400);
    }

    const normalizedEmployeeName = employee_name.trim();

    if (emp_id?.trim()) {
      const existingEmployeeCode = await getEmployeeByEmpIdModel(emp_id.trim());

      if (existingEmployeeCode) {
        return errorResponse(res, "Employee code already exists", 409);
      }
    }

    const existingEmployee = await getEmployeeByNameModel(normalizedEmployeeName);

    if (existingEmployee) {
      return errorResponse(res, "Employee name already exists", 409);
    }

    if (department) {
      const existingDepartment = await getDepartmentByNameModel(department);

      if (!existingDepartment || existingDepartment.status === "inactive") {
        return errorResponse(res, "Selected department does not exist", 400);
      }
    }

    if (designation) {
      const existingDesignation = await getDesignationByNameModel(designation);

      if (!existingDesignation || existingDesignation.status === "inactive") {
        return errorResponse(res, "Selected designation does not exist", 400);
      }

      const superAdminError = await ensureSingleSuperAdminDesignation(designation);

      if (superAdminError) {
        return errorResponse(res, superAdminError, 409);
      }
    }

    if (employee_type) {
      const existingEmployeeType = await getEmployeeTypeByNameModel(employee_type);

      if (!existingEmployeeType || existingEmployeeType.status === "inactive") {
        return errorResponse(res, "Selected employee type does not exist", 400);
      }
    }

    if (duty_shift) {
      const existingDutyShift = await getDutyShiftByNameModel(duty_shift);

      if (!existingDutyShift || existingDutyShift.status === "inactive") {
        return errorResponse(res, "Selected duty shift does not exist", 400);
      }
    }

    if (bank) {
      const existingBank = await getBankByNameModel(bank);

      if (!existingBank || existingBank.status === "inactive") {
        return errorResponse(res, "Selected bank does not exist", 400);
      }
    }

    const nextEmpId = emp_id?.trim() || await generateEmployeeCodeModel();
    const nextStatus = typeof enabled === "boolean"
      ? (enabled ? "active" : "inactive")
      : (status || "active");

    const result = await createEmployeeModel({
      emp_id: nextEmpId,
      employee_name: normalizedEmployeeName,
      first_name: normalizedEmployeeName,
      last_name: null,
      profile_image: toNullable(uploadedProfileImage || profile_image),
      father_name: toNullable(father_name),
      address: toNullable(address),
      city: toNullable(city),
      sex: toNullable(sex),
      email: toNullable(email),
      phone: toNullable(phone),
      mobile: toNullable(mobile),
      cnic_no: toNullable(cnic_no),
      date_of_birth: toNullable(date_of_birth),
      qualification: toNullable(qualification),
      blood_group: toNullable(blood_group),
      designation: toNullable(designation),
      department: toNullable(department),
      employee_type: toNullable(employee_type),
      hiring_date: toNullable(hiring_date),
      duty_shift: toNullable(duty_shift),
      bank: toNullable(bank),
      account_number: toNullable(account_number),
      status: nextStatus,
    });

    return successResponse(res, "Employee created successfully", {
      employee_id: result.insertId,
      emp_id: nextEmpId,
    }, 201);
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "Duplicate employee data already exists", 409);
    }

    return errorResponse(res, "Failed to create employee", 500, error.message);
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await getEmployeesModel();
    return successResponse(
      res,
      "Employees fetched successfully",
      employees.map(normalizeEmployee)
    );
  } catch (error) {
    return errorResponse(res, "Failed to fetch employees", 500, error.message);
  }
};

export const getEmployeeById = async (req, res) => {
  try {
    const employee = await getEmployeeByIdModel(req.params.id);

    if (!employee) {
      return errorResponse(res, "Employee not found", 404);
    }

    return successResponse(
      res,
      "Employee fetched successfully",
      normalizeEmployee(employee)
    );
  } catch (error) {
    return errorResponse(res, "Failed to fetch employee", 500, error.message);
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const uploadedProfileImage = toPublicUploadUrl(req.file?.path);
    const employeeId = req.params.id;
    const {
      emp_id,
      employee_name,
      profile_image,
      father_name,
      address,
      city,
      sex,
      email,
      phone,
      mobile,
      cnic_no,
      date_of_birth,
      qualification,
      blood_group,
      designation,
      department,
      employee_type,
      hiring_date,
      duty_shift,
      bank,
      account_number,
      status,
      enabled,
    } = req.body;

    const employee = await getEmployeeByIdModel(employeeId);

    if (!employee) {
      return errorResponse(res, "Employee not found", 404);
    }

    const previousProfileImage = employee.profile_image;

    if (department) {
      const existingDepartment = await getDepartmentByNameModel(department);

      if (!existingDepartment || existingDepartment.status === "inactive") {
        return errorResponse(res, "Selected department does not exist", 400);
      }
    }

    if (designation) {
      const existingDesignation = await getDesignationByNameModel(designation);

      if (!existingDesignation || existingDesignation.status === "inactive") {
        return errorResponse(res, "Selected designation does not exist", 400);
      }

      const superAdminError = await ensureSingleSuperAdminDesignation(
        designation,
        employeeId
      );

      if (superAdminError) {
        return errorResponse(res, superAdminError, 409);
      }
    }

    if (employee_type) {
      const existingEmployeeType = await getEmployeeTypeByNameModel(employee_type);

      if (!existingEmployeeType || existingEmployeeType.status === "inactive") {
        return errorResponse(res, "Selected employee type does not exist", 400);
      }
    }

    if (duty_shift) {
      const existingDutyShift = await getDutyShiftByNameModel(duty_shift);

      if (!existingDutyShift || existingDutyShift.status === "inactive") {
        return errorResponse(res, "Selected duty shift does not exist", 400);
      }
    }

    if (bank) {
      const existingBank = await getBankByNameModel(bank);

      if (!existingBank || existingBank.status === "inactive") {
        return errorResponse(res, "Selected bank does not exist", 400);
      }
    }

    const nextEmpId = emp_id?.trim() || employee.emp_id;
    const currentEmployeeName = employee.employee_name || employee.first_name || "";
    const nextEmployeeName = employee_name?.trim() || currentEmployeeName;
    const nextAddress = address ?? employee.address;
    const nextCity = city ?? employee.city;
    const nextSex = sex ?? employee.sex;
    const nextPhone = phone ?? employee.phone;
    const nextEmail = email ?? employee.email;
    const nextCnicNo = cnic_no ?? employee.cnic_no;
    const nextDepartment = department ?? employee.department;
    const nextDesignation = designation ?? employee.designation;
    const nextEmployeeType = employee_type ?? employee.employee_type;
    const nextDutyShift = duty_shift ?? employee.duty_shift;
    const nextBank = bank ?? employee.bank;
    const nextAccountNumber = account_number ?? employee.account_number;
    const nextStatus = typeof enabled === "boolean"
      ? (enabled ? "active" : "inactive")
      : (status || employee.status);

    const missingRequiredField = getMissingRequiredEmployeeField({
      employee_name: nextEmployeeName,
      address: nextAddress,
      city: nextCity,
      sex: nextSex,
      phone: nextPhone,
      email: nextEmail,
      cnic_no: nextCnicNo,
      department: nextDepartment,
      designation: nextDesignation,
      employee_type: nextEmployeeType,
      duty_shift: nextDutyShift,
      bank: nextBank,
      account_number: nextAccountNumber,
    });

    if (missingRequiredField) {
      return errorResponse(res, `${missingRequiredField} is required`, 400);
    }

    if (
      nextEmpId &&
      String(nextEmpId).trim().toLowerCase() !== String(employee.emp_id ?? "").trim().toLowerCase()
    ) {
      const existingEmployeeCode = await getEmployeeByEmpIdModel(nextEmpId);

      if (existingEmployeeCode && existingEmployeeCode.id !== Number(employeeId)) {
        return errorResponse(res, "Employee code already exists", 409);
      }
    }

    if (
      nextEmployeeName &&
      nextEmployeeName.trim().toLowerCase() !== String(currentEmployeeName).trim().toLowerCase()
    ) {
      const existingEmployee = await getEmployeeByNameModel(nextEmployeeName);

      if (existingEmployee && existingEmployee.id !== Number(employeeId)) {
        return errorResponse(res, "Employee name already exists", 409);
      }
    }

    await updateEmployeeModel({
      id: employeeId,
      emp_id: nextEmpId,
      employee_name: nextEmployeeName,
      first_name: nextEmployeeName,
      last_name: employee.last_name ?? null,
      profile_image: toNullable(
        uploadedProfileImage || profile_image || employee.profile_image
      ),
      father_name: toNullable(father_name ?? employee.father_name),
      address: toNullable(nextAddress),
      city: toNullable(nextCity),
      sex: toNullable(nextSex),
      email: toNullable(nextEmail),
      phone: toNullable(nextPhone),
      mobile: toNullable(mobile ?? employee.mobile),
      cnic_no: toNullable(nextCnicNo),
      date_of_birth: toNullable(date_of_birth ?? employee.date_of_birth),
      qualification: toNullable(qualification ?? employee.qualification),
      blood_group: toNullable(blood_group ?? employee.blood_group),
      designation: toNullable(nextDesignation),
      department: toNullable(nextDepartment),
      employee_type: toNullable(nextEmployeeType),
      hiring_date: toNullable(hiring_date ?? employee.hiring_date),
      duty_shift: toNullable(nextDutyShift),
      bank: toNullable(nextBank),
      account_number: toNullable(nextAccountNumber),
      status: nextStatus,
    });

    if (
      uploadedProfileImage &&
      previousProfileImage &&
      previousProfileImage !== uploadedProfileImage
    ) {
      await removeLocalFile(previousProfileImage);
    }

    const updatedEmployee = await getEmployeeByIdModel(employeeId);

    return successResponse(
      res,
      "Employee updated successfully",
      normalizeEmployee(updatedEmployee)
    );
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(res, "Duplicate employee data already exists", 409);
    }

    return errorResponse(res, "Failed to update employee", 500, error.message);
  }
};

export const deleteEmployee = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const employeeId = req.params.id;

    const [employeeRows] = await connection.execute(
      `SELECT id, profile_image FROM employees WHERE id = ?`,
      [employeeId]
    );

    if (!employeeRows.length) {
      return errorResponse(res, "Employee not found", 404);
    }

    await connection.beginTransaction();

    const [userRows] = await connection.execute(
      `SELECT id FROM users WHERE employee_id = ?`,
      [employeeId]
    );

    const userIds = userRows.map((user) => user.id);

    if (userIds.length) {
      // Remove only the membership rows for this employee's linked users.
      // Do not delete shared groups or group permissions.
      await connection.execute(
        `DELETE FROM user_groups WHERE user_id IN (${userIds.map(() => "?").join(", ")})`,
        userIds
      );

      // Delete the login users linked to this employee.
      await connection.execute(
        `DELETE FROM users WHERE id IN (${userIds.map(() => "?").join(", ")})`,
        userIds
      );
    }

    await connection.execute(`DELETE FROM employees WHERE id = ?`, [employeeId]);
    await connection.commit();
    await removeLocalFile(employeeRows[0].profile_image);

    return successResponse(res, "Employee deleted successfully");
  } catch (error) {
    await connection.rollback();
    return errorResponse(res, "Failed to delete employee", 500, error.message);
  } finally {
    connection.release();
  }
};

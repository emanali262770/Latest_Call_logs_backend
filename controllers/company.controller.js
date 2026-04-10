import { getUserPermissionsModel } from "../model/access.model.js";
import {
  createCompanyProfileModel,
  generateCompanyCodeModel,
  getCompanyProfileModel,
  getCompanySummaryModel,
  updateCompanyProfileModel,
} from "../model/company.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";
import { removeLocalFile, toPublicUploadUrl } from "../utils/localFiles.js";

const COMPANY_READ_PERMISSION = "SETUP.COMPANY.READ";

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

const toBoolean = (value) => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalizedValue = value.trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalizedValue);
  }

  return false;
};

const getMissingRequiredField = (fields) => {
  const requiredFields = [
    ["company_name", fields.company_name],
    ["phone", fields.phone],
    ["address", fields.address],
    ["representative", fields.representative],
    ["department", fields.department],
    ["designation", fields.designation],
    ["mobile_no", fields.mobile_no],
    ["ntn", fields.ntn],
    ["strn", fields.strn],
    ["year_of_establishment", fields.year_of_establishment],
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

export const getCompanyProfile = async (req, res) => {
  try {
    const username = String(req.user?.username || "").trim().toLowerCase();
    const canReadFullCompanyProfile = username === "admin"
      ? true
      : (await getUserPermissionsModel(req.user.id)).some(
          (permission) => permission.key_name === COMPANY_READ_PERMISSION
        );

    const company = canReadFullCompanyProfile
      ? await getCompanyProfileModel()
      : await getCompanySummaryModel();

    return successResponse(res, "Company profile fetched successfully", company);
  } catch (error) {
    return errorResponse(res, "Failed to fetch company profile", 500, error.message);
  }
};

export const printCompanyProfile = async (req, res) => {
  try {
    const company = await getCompanyProfileModel();

    return successResponse(res, "Company profile fetched successfully for print", company);
  } catch (error) {
    return errorResponse(res, "Failed to fetch company profile for print", 500, error.message);
  }
};

export const upsertCompanyProfile = async (req, res) => {
  try {
    const existingCompany = await getCompanyProfileModel();
    const files = req.files || {};
    const companyLogoUrl = toPublicUploadUrl(files.company_logo?.[0]?.path);
    const ntnDocumentUrl = toPublicUploadUrl(files.ntn_document?.[0]?.path);
    const strnDocumentUrl = toPublicUploadUrl(files.strn_document?.[0]?.path);
    const shouldRemoveCompanyLogo = toBoolean(req.body.remove_company_logo);
    const shouldRemoveNtnDocument = toBoolean(req.body.remove_ntn_document);
    const shouldRemoveStrnDocument = toBoolean(req.body.remove_strn_document);

    const payload = {
      company_logo: shouldRemoveCompanyLogo && !companyLogoUrl
        ? null
        : toNullable(companyLogoUrl || req.body.company_logo || existingCompany?.company_logo),
      company_name: toNullable(req.body.company_name ?? existingCompany?.company_name),
      phone: toNullable(req.body.phone ?? existingCompany?.phone),
      email: toNullable(req.body.email ?? existingCompany?.email),
      website: toNullable(req.body.website ?? existingCompany?.website),
      address: toNullable(req.body.address ?? existingCompany?.address),
      representative: toNullable(req.body.representative ?? existingCompany?.representative),
      department: toNullable(req.body.department ?? existingCompany?.department),
      designation: toNullable(req.body.designation ?? existingCompany?.designation),
      mobile_no: toNullable(req.body.mobile_no ?? existingCompany?.mobile_no),
      ntn: toNullable(req.body.ntn ?? existingCompany?.ntn),
      ntn_document: shouldRemoveNtnDocument && !ntnDocumentUrl
        ? null
        : toNullable(ntnDocumentUrl || req.body.ntn_document || existingCompany?.ntn_document),
      strn: toNullable(req.body.strn ?? existingCompany?.strn),
      strn_document: shouldRemoveStrnDocument && !strnDocumentUrl
        ? null
        : toNullable(strnDocumentUrl || req.body.strn_document || existingCompany?.strn_document),
      year_of_establishment: toNullable(
        req.body.year_of_establishment ?? existingCompany?.year_of_establishment
      ),
    };

    const missingRequiredField = getMissingRequiredField(payload);

    if (missingRequiredField) {
      return errorResponse(res, `${missingRequiredField} is required`, 400);
    }

    if (!existingCompany) {
      const companyId = await generateCompanyCodeModel();

      await createCompanyProfileModel({
        company_id: companyId,
        ...payload,
      });

      const createdCompany = await getCompanyProfileModel();

      return successResponse(
        res,
        "Company profile created successfully",
        createdCompany,
        201
      );
    }

    await updateCompanyProfileModel({
      id: existingCompany.id,
      ...payload,
    });

    if (
      companyLogoUrl &&
      existingCompany.company_logo &&
      existingCompany.company_logo !== companyLogoUrl
    ) {
      await removeLocalFile(existingCompany.company_logo);
    }

    if (
      shouldRemoveCompanyLogo &&
      !companyLogoUrl &&
      existingCompany.company_logo
    ) {
      await removeLocalFile(existingCompany.company_logo);
    }

    if (
      ntnDocumentUrl &&
      existingCompany.ntn_document &&
      existingCompany.ntn_document !== ntnDocumentUrl
    ) {
      await removeLocalFile(existingCompany.ntn_document);
    }

    if (
      shouldRemoveNtnDocument &&
      !ntnDocumentUrl &&
      existingCompany.ntn_document
    ) {
      await removeLocalFile(existingCompany.ntn_document);
    }

    if (
      strnDocumentUrl &&
      existingCompany.strn_document &&
      existingCompany.strn_document !== strnDocumentUrl
    ) {
      await removeLocalFile(existingCompany.strn_document);
    }

    if (
      shouldRemoveStrnDocument &&
      !strnDocumentUrl &&
      existingCompany.strn_document
    ) {
      await removeLocalFile(existingCompany.strn_document);
    }

    const updatedCompany = await getCompanyProfileModel();

    return successResponse(
      res,
      "Company profile updated successfully",
      updatedCompany
    );
  } catch (error) {
    return errorResponse(res, "Failed to save company profile", 500, error.message);
  }
};

import {
  createSubCategoryModel,
  getSubCategoriesModel,
  getSubCategoryByIdModel,
  getSubCategoryByNameAndCategoryModel,
  updateSubCategoryModel,
  deleteSubCategoryModel,
} from "../model/subCategory.model.js";
import { getCategoryByIdModel } from "../model/category.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createSubCategory = async (req, res) => {
  try {
    const { category_id, sub_category_name, status } = req.body;

    if (!category_id) {
      return errorResponse(res, "category_id is required", 400);
    }

    if (!sub_category_name?.trim()) {
      return errorResponse(res, "sub_category_name is required", 400);
    }

    const category = await getCategoryByIdModel(category_id);
    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    const existing = await getSubCategoryByNameAndCategoryModel(sub_category_name, category_id);
    if (existing) {
      return errorResponse(res, "Sub category already exists in this category", 409);
    }

    const result = await createSubCategoryModel({
      category_id,
      sub_category_name,
      status,
    });

    return successResponse(
      res,
      "Sub category created successfully",
      { sub_category_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create sub category", 500, error.message);
  }
};

export const getSubCategories = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const requestedStatus = req.query.status?.trim().toLowerCase();
    const status =
      requestedStatus === "active" || requestedStatus === "inactive"
        ? requestedStatus
        : undefined;
    const subCategories = await getSubCategoriesModel(search, status);

    return successResponse(res, "Sub categories fetched successfully", {
      records: subCategories.length,
      subCategories,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch sub categories", 500, error.message);
  }
};

export const getSubCategoryById = async (req, res) => {
  try {
    const subCategory = await getSubCategoryByIdModel(req.params.id);

    if (!subCategory) {
      return errorResponse(res, "Sub category not found", 404);
    }

    return successResponse(res, "Sub category fetched successfully", subCategory);
  } catch (error) {
    return errorResponse(res, "Failed to fetch sub category", 500, error.message);
  }
};

export const updateSubCategory = async (req, res) => {
  try {
    const subCategoryId = req.params.id;
    const { category_id, sub_category_name, status } = req.body;

    const subCategory = await getSubCategoryByIdModel(subCategoryId);
    if (!subCategory) {
      return errorResponse(res, "Sub category not found", 404);
    }

    const nextCategoryId = category_id ?? subCategory.category_id;
    const nextName = sub_category_name?.trim() || subCategory.sub_category_name;

    if (category_id) {
      const category = await getCategoryByIdModel(category_id);
      if (!category) {
        return errorResponse(res, "Category not found", 404);
      }
    }

    const duplicate = await getSubCategoryByNameAndCategoryModel(nextName, nextCategoryId);
    if (duplicate && duplicate.id !== Number(subCategoryId)) {
      return errorResponse(res, "Sub category already exists in this category", 409);
    }

    await updateSubCategoryModel({
      id: subCategoryId,
      category_id: nextCategoryId,
      sub_category_name: nextName,
      status: status ?? subCategory.status,
    });

    const updated = await getSubCategoryByIdModel(subCategoryId);

    return successResponse(res, "Sub category updated successfully", updated);
  } catch (error) {
    return errorResponse(res, "Failed to update sub category", 500, error.message);
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    const subCategoryId = req.params.id;

    const subCategory = await getSubCategoryByIdModel(subCategoryId);
    if (!subCategory) {
      return errorResponse(res, "Sub category not found", 404);
    }

    await deleteSubCategoryModel(subCategory.id);

    return successResponse(res, "Sub category deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete sub category", 500, error.message);
  }
};

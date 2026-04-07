import {
  createCategoryModel,
  getCategoriesModel,
  getCategoryByIdModel,
  getCategoryByNameModel,
  updateCategoryModel,
  deleteCategoryModel,
} from "../model/category.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createCategory = async (req, res) => {
  try {
    const { category_name, status } = req.body;

    if (!category_name?.trim()) {
      return errorResponse(res, "category_name is required", 400);
    }

    const existingCategory = await getCategoryByNameModel(category_name);

    if (existingCategory) {
      return errorResponse(res, "Category already exists", 409);
    }

    const result = await createCategoryModel({
      category_name,
      status,
    });

    return successResponse(
      res,
      "Category created successfully",
      { category_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create category", 500, error.message);
  }
};

export const getCategories = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const categories = await getCategoriesModel(search);

    return successResponse(res, "Categories fetched successfully", {
      records: categories.length,
      categories,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch categories", 500, error.message);
  }
};

export const getCategoryById = async (req, res) => {
  try {
    const category = await getCategoryByIdModel(req.params.id);

    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    return successResponse(res, "Category fetched successfully", category);
  } catch (error) {
    return errorResponse(res, "Failed to fetch category", 500, error.message);
  }
};

export const updateCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { category_name, status } = req.body;

    const category = await getCategoryByIdModel(categoryId);

    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    const nextCategoryName = category_name?.trim() || category.category_name;

    const duplicateCategory = await getCategoryByNameModel(nextCategoryName);

    if (duplicateCategory && duplicateCategory.id !== Number(categoryId)) {
      return errorResponse(res, "Category already exists", 409);
    }

    await updateCategoryModel({
      id: categoryId,
      category_name: nextCategoryName,
      status: status ?? category.status,
    });

    const updatedCategory = await getCategoryByIdModel(categoryId);

    return successResponse(
      res,
      "Category updated successfully",
      updatedCategory
    );
  } catch (error) {
    return errorResponse(res, "Failed to update category", 500, error.message);
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;

    const category = await getCategoryByIdModel(categoryId);

    if (!category) {
      return errorResponse(res, "Category not found", 404);
    }

    await deleteCategoryModel(category.id);

    return successResponse(res, "Category deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete category", 500, error.message);
  }
};

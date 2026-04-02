import {
  createBankModel,
  getBanksModel,
  getBankByIdModel,
  getBankByNameModel,
  updateBankModel,
  deleteBankModel,
} from "../model/bank.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

export const createBank = async (req, res) => {
  try {
    const { bank_name, status } = req.body;

    if (!bank_name?.trim()) {
      return errorResponse(res, "bank_name is required", 400);
    }

    const existingBank = await getBankByNameModel(bank_name);

    if (existingBank) {
      return errorResponse(res, "Bank already exists", 409);
    }

    const result = await createBankModel({
      bank_name,
      status,
    });

    return successResponse(
      res,
      "Bank created successfully",
      { bank_id: result.insertId },
      201
    );
  } catch (error) {
    return errorResponse(res, "Failed to create bank", 500, error.message);
  }
};

export const getBanks = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const banks = await getBanksModel(search);

    return successResponse(res, "Banks fetched successfully", {
      records: banks.length,
      banks,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch banks", 500, error.message);
  }
};

export const getBankById = async (req, res) => {
  try {
    const bank = await getBankByIdModel(req.params.id);

    if (!bank) {
      return errorResponse(res, "Bank not found", 404);
    }

    return successResponse(res, "Bank fetched successfully", bank);
  } catch (error) {
    return errorResponse(res, "Failed to fetch bank", 500, error.message);
  }
};

export const updateBank = async (req, res) => {
  try {
    const bankId = req.params.id;
    const { bank_name, status } = req.body;

    const bank = await getBankByIdModel(bankId);

    if (!bank) {
      return errorResponse(res, "Bank not found", 404);
    }

    const nextBankName = bank_name?.trim() || bank.bank_name;

    const duplicateBank = await getBankByNameModel(nextBankName);

    if (duplicateBank && duplicateBank.id !== Number(bankId)) {
      return errorResponse(res, "Bank already exists", 409);
    }

    await updateBankModel({
      id: bankId,
      bank_name: nextBankName,
      status: status ?? bank.status,
    });

    const updatedBank = await getBankByIdModel(bankId);

    return successResponse(
      res,
      "Bank updated successfully",
      updatedBank
    );
  } catch (error) {
    return errorResponse(res, "Failed to update bank", 500, error.message);
  }
};

export const deleteBank = async (req, res) => {
  try {
    const bankId = req.params.id;

    const bank = await getBankByIdModel(bankId);

    if (!bank) {
      return errorResponse(res, "Bank not found", 404);
    }

    await deleteBankModel(bank.id);

    return successResponse(res, "Bank deleted successfully");
  } catch (error) {
    return errorResponse(res, "Failed to delete bank", 500, error.message);
  }
};

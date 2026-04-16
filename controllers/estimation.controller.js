import {
  createEstimationModel,
  deleteEstimationModel,
  getEstimationByIdModel,
  getEstimationsModel,
  getNextEstimateIdModel,
  updateEstimationModel,
} from "../model/estimation.model.js";
import { getCustomerByIdModel } from "../model/customer.model.js";
import { getServiceByIdModel } from "../model/service.model.js";
import { getItemRateByIdModel } from "../model/itemRate.model.js";
import { getCompanySummaryModel } from "../model/company.model.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toNullable = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? null : t;
  }
  return value;
};

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Recalculate all derived fields from base inputs.
 * purchase_price  = reseller_price (PKR) from item_rate
 * sale_price      = item_rate.sale_price  (before tax)
 * sale_price_with_tax = item_rate.sale_price_with_tax
 */
const calcFields = ({ qty, purchase_price, sale_price, sale_price_with_tax, discount_percent }) => {
  const q   = toNumber(qty, 0);
  const pp  = toNumber(purchase_price, 0);
  const sp  = toNumber(sale_price, 0);
  const spwt = toNumber(sale_price_with_tax, 0);
  const disc = toNumber(discount_percent, 0);

  const purchase_total      = roundMoney(pp * q);
  const sale_total          = roundMoney(sp * q);
  const sale_total_with_tax = roundMoney(spwt * q);

  const discount_amount = roundMoney((spwt * disc) / 100);
  const final_price     = roundMoney(spwt - discount_amount);
  const final_total     = roundMoney(final_price * q);

  return {
    purchase_total,
    sale_total,
    sale_total_with_tax,
    discount_amount,
    final_price,
    final_total,
  };
};

// ─── CREATE ──────────────────────────────────────────────────────────────────
export const createEstimation = async (req, res) => {
  try {
    const {
      estimate_date,
      customer_id,
      service_id,
      item_rate_id,
      qty,
      description,
      discount_percent,
      status,
    } = req.body;

    // Required
    if (!estimate_date) {
      return errorResponse(res, "estimate_date is required", 400);
    }

    if (!item_rate_id) {
      return errorResponse(res, "item_rate_id is required", 400);
    }

    const parsedQty = toNumber(qty, 0);
    if (parsedQty <= 0) {
      return errorResponse(res, "qty must be greater than 0", 400);
    }

    // Load item rate to snapshots prices
    const itemRate = await getItemRateByIdModel(item_rate_id);
    if (!itemRate) {
      return errorResponse(res, "Item rate not found", 404);
    }

    // Validate customer if provided
    let customerPerson = null;
    let customerDesignation = null;

    if (customer_id) {
      const customer = await getCustomerByIdModel(customer_id);
      if (!customer) {
        return errorResponse(res, "Customer not found", 404);
      }
      customerPerson      = customer.person      ?? null;
      customerDesignation = customer.designation ?? null;
    }

    // Validate service if provided
    if (service_id) {
      const service = await getServiceByIdModel(service_id);
      if (!service) {
        return errorResponse(res, "Service not found", 404);
      }
    }

    // Prices from item rate
    const purchase_price      = toNumber(itemRate.resellerPrice,    0); // PKR reseller price
    const sale_price          = toNumber(itemRate.salePrice,         0);
    const sale_price_with_tax = toNumber(itemRate.salePriceWithTax,  0);
    const disc                = toNumber(discount_percent, 0);

    const {
      purchase_total,
      sale_total,
      sale_total_with_tax,
      discount_amount,
      final_price,
      final_total,
    } = calcFields({ qty: parsedQty, purchase_price, sale_price, sale_price_with_tax, discount_percent: disc });

    // Auto-generate estimate ID
    const estimate_id = await getNextEstimateIdModel();

    await createEstimationModel({
      estimate_id,
      estimate_date,
      customer_id:          toNullable(customer_id),
      person:               customerPerson,
      designation:          customerDesignation,
      service_id:           toNullable(service_id),
      created_by:           req.user?.id ?? null,
      item_rate_id,
      item_name:            itemRate.item ?? null,
      qty:                  parsedQty,
      description:          toNullable(description),
      purchase_price,
      purchase_total,
      sale_price,
      sale_total,
      sale_price_with_tax,
      sale_total_with_tax,
      discount_percent:     disc,
      discount_amount,
      final_price,
      final_total,
      status:               status ?? "active",
    });

    const created = await getEstimationsModel({ search: "", status: null, customer_id: null });
    const newRecord = created.find((e) => e.estimateId === estimate_id);

    return successResponse(res, "Estimation created successfully", newRecord, 201);
  } catch (error) {
    console.error("createEstimation error:", error);
    return errorResponse(res, "Failed to create estimation", 500);
  }
};

// ─── GET ALL ──────────────────────────────────────────────────────────────────
export const getEstimations = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const estimations = await getEstimationsModel({
      search:      search      || "",
      status:      status      || null,
      customer_id: customer_id || null,
    });

    const totalPurchases = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.purchaseTotal, 0), 0)
    );
    const totalDiscount = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.discountAmount, 0), 0)
    );
    const totalFinal = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.finalTotal, 0), 0)
    );
    const profit = roundMoney(totalFinal - totalPurchases);

    return successResponse(res, "Estimations fetched successfully", {
      estimations,
      summary: {
        totalPurchases,
        totalDiscount,
        totalFinal,
        profit,
      },
    });
  } catch (error) {
    console.error("getEstimations error:", error);
    return errorResponse(res, "Failed to fetch estimations", 500);
  }
};

// ─── GET BY ID ────────────────────────────────────────────────────────────────
export const getEstimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationByIdModel(id);

    if (!estimation) {
      return errorResponse(res, "Estimation not found", 404);
    }

    return successResponse(res, "Estimation fetched successfully", estimation);
  } catch (error) {
    console.error("getEstimationById error:", error);
    return errorResponse(res, "Failed to fetch estimation", 500);
  }
};

// ─── UPDATE ───────────────────────────────────────────────────────────────────
export const updateEstimation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      estimate_date,
      customer_id,
      service_id,
      item_rate_id,
      qty,
      description,
      discount_percent,
      status,
    } = req.body;

    const existing = await getEstimationByIdModel(id);
    if (!existing) {
      return errorResponse(res, "Estimation not found", 404);
    }

    if (!estimate_date) {
      return errorResponse(res, "estimate_date is required", 400);
    }

    const parsedQty = toNumber(qty, 0);
    if (parsedQty <= 0) {
      return errorResponse(res, "qty must be greater than 0", 400);
    }

    // Resolve item rate (use new one if provided, else keep existing)
    const resolvedItemRateId = item_rate_id ?? existing.itemRateId;
    const itemRate = await getItemRateByIdModel(resolvedItemRateId);
    if (!itemRate) {
      return errorResponse(res, "Item rate not found", 404);
    }

    // Resolve customer
    let customerPerson      = existing.person;
    let customerDesignation = existing.designation;
    const resolvedCustomerId = customer_id !== undefined ? toNullable(customer_id) : existing.customerId;

    if (resolvedCustomerId) {
      const customer = await getCustomerByIdModel(resolvedCustomerId);
      if (!customer) {
        return errorResponse(res, "Customer not found", 404);
      }
      customerPerson      = customer.person      ?? null;
      customerDesignation = customer.designation ?? null;
    }

    // Validate service if provided
    const resolvedServiceId = service_id !== undefined ? toNullable(service_id) : existing.serviceId;
    if (resolvedServiceId) {
      const service = await getServiceByIdModel(resolvedServiceId);
      if (!service) {
        return errorResponse(res, "Service not found", 404);
      }
    }

    const purchase_price      = toNumber(itemRate.resellerPrice,   0);
    const sale_price          = toNumber(itemRate.salePrice,        0);
    const sale_price_with_tax = toNumber(itemRate.salePriceWithTax, 0);
    const disc                = toNumber(discount_percent, 0);

    const {
      purchase_total,
      sale_total,
      sale_total_with_tax,
      discount_amount,
      final_price,
      final_total,
    } = calcFields({ qty: parsedQty, purchase_price, sale_price, sale_price_with_tax, discount_percent: disc });

    await updateEstimationModel(id, {
      estimate_date,
      customer_id:          resolvedCustomerId,
      person:               customerPerson,
      designation:          customerDesignation,
      service_id:           resolvedServiceId,
      item_rate_id:         resolvedItemRateId,
      item_name:            itemRate.item ?? null,
      qty:                  parsedQty,
      description:          toNullable(description),
      purchase_price,
      purchase_total,
      sale_price,
      sale_total,
      sale_price_with_tax,
      sale_total_with_tax,
      discount_percent:     disc,
      discount_amount,
      final_price,
      final_total,
      status:               status ?? existing.status,
    });

    const updated = await getEstimationByIdModel(id);
    return successResponse(res, "Estimation updated successfully", updated);
  } catch (error) {
    console.error("updateEstimation error:", error);
    return errorResponse(res, "Failed to update estimation", 500);
  }
};

// ─── DELETE ───────────────────────────────────────────────────────────────────
export const deleteEstimation = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await getEstimationByIdModel(id);
    if (!existing) {
      return errorResponse(res, "Estimation not found", 404);
    }

    await deleteEstimationModel(id);
    return successResponse(res, "Estimation deleted successfully");
  } catch (error) {
    console.error("deleteEstimation error:", error);
    return errorResponse(res, "Failed to delete estimation", 500);
  }
};

// ─── PRINT ALL ────────────────────────────────────────────────────────────────
export const printEstimations = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const estimations = await getEstimationsModel({
      search:      search      || "",
      status:      status      || null,
      customer_id: customer_id || null,
    });

    const company = await getCompanySummaryModel();

    const totalPurchases = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.purchaseTotal, 0), 0)
    );
    const totalDiscount = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.discountAmount, 0), 0)
    );
    const totalFinal = roundMoney(
      estimations.reduce((sum, e) => sum + toNumber(e.finalTotal, 0), 0)
    );
    const profit = roundMoney(totalFinal - totalPurchases);

    return successResponse(res, "Estimations fetched successfully for print", {
      company,
      estimations,
      summary: {
        totalPurchases,
        totalDiscount,
        totalFinal,
        profit,
      },
    });
  } catch (error) {
    console.error("printEstimations error:", error);
    return errorResponse(res, "Failed to fetch estimations for print", 500);
  }
};

// ─── PRINT SINGLE ─────────────────────────────────────────────────────────────
export const printEstimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationByIdModel(id);

    if (!estimation) {
      return errorResponse(res, "Estimation not found", 404);
    }

    const company = await getCompanySummaryModel();

    return successResponse(res, "Estimation fetched successfully for print", {
      company,
      estimation,
    });
  } catch (error) {
    console.error("printEstimationById error:", error);
    return errorResponse(res, "Failed to fetch estimation for print", 500);
  }
};

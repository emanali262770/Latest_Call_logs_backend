import { db } from "../config/db.js";
import {
  createEstimationHeaderModel,
  createEstimationItemsModel,
  deleteEstimationItemsModel,
  deleteEstimationModel,
  getEstimationByIdModel,
  getEstimationItemsByEstimationIdModel,
  getEstimationsModel,
  getNextEstimateIdModel,
  updateEstimationHeaderModel,
} from "../model/estimation.model.js";
import { getCustomerByIdModel } from "../model/customer.model.js";
import { getServiceByIdModel } from "../model/service.model.js";
import { getItemRateByIdModel } from "../model/itemRate.model.js";
import { getCompanySummaryModel } from "../model/company.model.js";
import { sendEstimationDelivery } from "../services/estimationDelivery.service.js";
import {
  DEFAULT_ESTIMATION_TEMPLATE,
  getEstimationPrintTemplates,
  isValidEstimationTemplate,
} from "../services/estimationPrintTemplate.service.js";
import { ensureEstimationTemplatePreviewPdfs } from "../services/estimationPdf.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const toNullable = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
};

const buildDeliveryOptions = (body) => ({
  sendEmail: body.sendEmail === true || body.send_email === true,
  sendWhatsapp:
    body.sendWhatsapp === false || body.send_whatsapp === false ? false : true,
});

const attachDelivery = async (estimation, body) => {
  const options = buildDeliveryOptions(body);
  const delivery = await sendEstimationDelivery({ estimation, ...options });
  return { ...estimation, delivery };
};

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeTaxMode = (value) => {
  const normalized = toNullable(value);
  return normalized === "withTax" || normalized === "withoutTax" ? normalized : null;
};

const normalizePrintTemplate = (value) => {
  const s = toNullable(value);
  return s && isValidEstimationTemplate(s) ? s : DEFAULT_ESTIMATION_TEMPLATE;
};

const buildEstimationsSummary = (estimations) => {
  const totalPurchases = roundMoney(
    estimations.reduce((sum, item) => sum + toNumber(item.purchaseTotal, 0), 0)
  );
  const totalDiscount = roundMoney(
    estimations.reduce((sum, item) => sum + toNumber(item.discountTotal, 0), 0)
  );
  const totalFinal = roundMoney(
    estimations.reduce((sum, item) => sum + toNumber(item.finalTotal, 0), 0)
  );
  const profit = roundMoney(totalFinal - totalPurchases);

  return {
    totalPurchases,
    totalDiscount,
    totalFinal,
    profit,
  };
};

const calcFields = ({
  qty,
  purchase_price,
  sale_price,
  sale_price_with_tax,
  discount_percent,
  tax_mode,
}) => {
  const q = toNumber(qty, 0);
  const pp = toNumber(purchase_price, 0);
  const sp = toNumber(sale_price, 0);
  const spwt = toNumber(sale_price_with_tax, 0);
  const disc = toNumber(discount_percent, 0);

  const purchase_total = roundMoney(pp * q);
  const sale_total = roundMoney(sp * q);
  const sale_total_with_tax = roundMoney(spwt * q);

  const basePrice = tax_mode === "withoutTax" ? sp : spwt;
  const perUnitDiscount = roundMoney((basePrice * disc) / 100);
  const discount_amount = roundMoney(perUnitDiscount * q);
  const final_price = roundMoney(Math.max(basePrice - perUnitDiscount, 0));
  const final_total = roundMoney(final_price * q);

  return {
    purchase_total,
    sale_total,
    sale_total_with_tax,
    discount_amount,
    final_price,
    final_total,
  };
};

const buildTotals = (items, taxMode) => ({
  grand_purchase_total: roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.purchase_total, 0), 0)
  ),
  grand_sale_total: roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        (taxMode === "withTax"
          ? toNumber(item.sale_total_with_tax, 0)
          : toNumber(item.sale_total, 0)),
      0
    )
  ),
  grand_discount_total: roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.discount_amount, 0), 0)
  ),
  grand_final_total: roundMoney(
    items.reduce((sum, item) => sum + toNumber(item.final_total, 0), 0)
  ),
});

const normalizeItems = async (items, taxMode) => {
  if (!Array.isArray(items) || !items.length) {
    return { error: "At least one item is required" };
  }

  const normalizedItems = [];

  for (const rawItem of items) {
    const itemRateId = toNullable(rawItem.item_rate_id);
    if (!itemRateId) {
      return { error: "Each item must include item_rate_id" };
    }

    const parsedQty = toNumber(rawItem.qty, 0);
    if (parsedQty <= 0) {
      return { error: "Each item qty must be greater than 0" };
    }

    const itemRate = await getItemRateByIdModel(itemRateId);
    if (!itemRate) {
      return { error: `Item rate not found for item_rate_id ${itemRateId}` };
    }

    const purchase_price = toNumber(itemRate.resellerPrice, 0);
    const sale_price = toNumber(itemRate.salePrice, 0);
    const sale_price_with_tax = toNumber(itemRate.salePriceWithTax, 0);
    const discount_percent = toNumber(rawItem.discount_percent, 0);

    const calculated = calcFields({
      qty: parsedQty,
      purchase_price,
      sale_price,
      sale_price_with_tax,
      discount_percent,
      tax_mode: taxMode,
    });

    normalizedItems.push({
      item_rate_id: itemRateId,
      item_name: itemRate.item ?? null,
      qty: parsedQty,
      description: toNullable(rawItem.description),
      purchase_price,
      purchase_total: calculated.purchase_total,
      sale_price,
      sale_total: calculated.sale_total,
      sale_price_with_tax,
      sale_total_with_tax: calculated.sale_total_with_tax,
      discount_percent,
      discount_amount: calculated.discount_amount,
      final_price: calculated.final_price,
      final_total: calculated.final_total,
    });
  }

  return { items: normalizedItems };
};

const attachItemsAndSummary = async (estimation) => {
  if (!estimation) return null;

  const items = await getEstimationItemsByEstimationIdModel(estimation.id);

  return {
    ...estimation,
    items,
    summary: {
      purchaseTotal: toNumber(estimation.purchaseTotal, 0),
      saleTotal: toNumber(estimation.saleTotal, 0),
      discountTotal: toNumber(estimation.discountTotal, 0),
      finalTotal: toNumber(estimation.finalTotal, 0),
    },
  };
};

const attachItemsToEstimations = async (estimations) => {
  return Promise.all(
    estimations.map(async (estimation) => {
      const items = await getEstimationItemsByEstimationIdModel(estimation.id);
      return {
        ...estimation,
        items,
      };
    })
  );
};

export const createEstimation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { estimate_date, customer_id, service_id, status, items } = req.body;

    if (!estimate_date) {
      return errorResponse(res, "estimate_date is required", 400);
    }

    const taxMode = normalizeTaxMode(req.body.tax_mode ?? req.body.taxMode);
    if (!taxMode) {
      return errorResponse(res, "tax_mode is required (withoutTax or withTax)", 400);
    }

    const normalized = await normalizeItems(items, taxMode);
    if (normalized.error) {
      return errorResponse(res, normalized.error, 400);
    }

    let customerPerson = null;
    let customerDesignation = null;
    const resolvedCustomerId = toNullable(customer_id);

    if (resolvedCustomerId) {
      const customer = await getCustomerByIdModel(resolvedCustomerId);
      if (!customer) {
        return errorResponse(res, "Customer not found", 404);
      }
      customerPerson = customer.person ?? null;
      customerDesignation = customer.designation ?? null;
    }

    const resolvedServiceId = toNullable(service_id);
    if (resolvedServiceId) {
      const service = await getServiceByIdModel(resolvedServiceId);
      if (!service) {
        return errorResponse(res, "Service not found", 404);
      }
    }

    const estimate_id = await getNextEstimateIdModel();
    const totals = buildTotals(normalized.items, taxMode);
    const print_template = normalizePrintTemplate(req.body.print_template ?? req.body.printTemplate);

    await connection.beginTransaction();

    const headerResult = await createEstimationHeaderModel(connection, {
      estimate_id,
      estimate_date,
      customer_id: resolvedCustomerId,
      person: customerPerson,
      designation: customerDesignation,
      service_id: resolvedServiceId,
      tax_mode: taxMode,
      print_template,
      created_by: req.user?.id ?? null,
      ...totals,
      status: status ?? "active",
    });

    await createEstimationItemsModel(
      connection,
      headerResult.insertId,
      normalized.items
    );

    await connection.commit();

    const created = await getEstimationByIdModel(headerResult.insertId);
    const withItems = await attachItemsAndSummary(created);
    const response = await attachDelivery(withItems, req.body);

    return successResponse(res, "Estimation created successfully", response, 201);
  } catch (error) {
    await connection.rollback();
    console.error("createEstimation error:", error);
    return errorResponse(res, "Failed to create estimation", 500);
  } finally {
    connection.release();
  }
};

export const getEstimations = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const estimations = await getEstimationsModel({
      search: search || "",
      status: status || null,
      customer_id: customer_id || null,
    });

    const estimationsWithItems = await attachItemsToEstimations(estimations);
    const summary = buildEstimationsSummary(estimations);

    return successResponse(res, "Estimations fetched successfully", {
      estimations: estimationsWithItems,
      summary,
    });
  } catch (error) {
    console.error("getEstimations error:", error);
    return errorResponse(res, "Failed to fetch estimations", 500);
  }
};

export const getEstimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationByIdModel(id);

    if (!estimation) {
      return errorResponse(res, "Estimation not found", 404);
    }

    const response = await attachItemsAndSummary(estimation);
    return successResponse(res, "Estimation fetched successfully", response);
  } catch (error) {
    console.error("getEstimationById error:", error);
    return errorResponse(res, "Failed to fetch estimation", 500);
  }
};

export const updateEstimation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const { estimate_date, customer_id, service_id, status, items } = req.body;

    const existing = await getEstimationByIdModel(id);
    if (!existing) {
      return errorResponse(res, "Estimation not found", 404);
    }

    if (!estimate_date) {
      return errorResponse(res, "estimate_date is required", 400);
    }

    const taxMode = normalizeTaxMode(req.body.tax_mode ?? req.body.taxMode ?? existing.taxMode);
    if (!taxMode) {
      return errorResponse(res, "tax_mode is required (withoutTax or withTax)", 400);
    }

    const normalized = await normalizeItems(items, taxMode);
    if (normalized.error) {
      return errorResponse(res, normalized.error, 400);
    }

    const resolvedCustomerId =
      customer_id !== undefined ? toNullable(customer_id) : existing.customerId;
    let customerPerson = existing.person ?? null;
    let customerDesignation = existing.designation ?? null;

    if (resolvedCustomerId) {
      const customer = await getCustomerByIdModel(resolvedCustomerId);
      if (!customer) {
        return errorResponse(res, "Customer not found", 404);
      }
      customerPerson = customer.person ?? null;
      customerDesignation = customer.designation ?? null;
    } else {
      customerPerson = null;
      customerDesignation = null;
    }

    const resolvedServiceId =
      service_id !== undefined ? toNullable(service_id) : existing.serviceId;
    if (resolvedServiceId) {
      const service = await getServiceByIdModel(resolvedServiceId);
      if (!service) {
        return errorResponse(res, "Service not found", 404);
      }
    }

    const totals = buildTotals(normalized.items, taxMode);
    const print_template = normalizePrintTemplate(
      req.body.print_template ?? req.body.printTemplate ?? existing.printTemplate
    );

    await connection.beginTransaction();

    await updateEstimationHeaderModel(connection, id, {
      estimate_date,
      customer_id: resolvedCustomerId,
      person: customerPerson,
      designation: customerDesignation,
      service_id: resolvedServiceId,
      tax_mode: taxMode,
      print_template,
      ...totals,
      status: status ?? existing.status,
    });

    await deleteEstimationItemsModel(connection, id);
    await createEstimationItemsModel(connection, id, normalized.items);

    await connection.commit();

    const updated = await getEstimationByIdModel(id);
    const withItems = await attachItemsAndSummary(updated);
    const response = await attachDelivery(withItems, req.body);

    return successResponse(res, "Estimation updated successfully", response);
  } catch (error) {
    await connection.rollback();
    console.error("updateEstimation error:", error);
    return errorResponse(res, "Failed to update estimation", 500);
  } finally {
    connection.release();
  }
};

export const deleteEstimation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { id } = req.params;
    const existing = await getEstimationByIdModel(id);

    if (!existing) {
      return errorResponse(res, "Estimation not found", 404);
    }

    await connection.beginTransaction();
    await deleteEstimationModel(connection, id);
    await connection.commit();

    return successResponse(res, "Estimation deleted successfully");
  } catch (error) {
    await connection.rollback();
    console.error("deleteEstimation error:", error);
    return errorResponse(res, "Failed to delete estimation", 500);
  } finally {
    connection.release();
  }
};

export const getEstimationTemplates = async (req, res) => {
  try {
    const templates = getEstimationPrintTemplates();
    const previewUrls = await ensureEstimationTemplatePreviewPdfs();
    const version = Date.now();
    const withPreviews = templates.map(({ previewHtml, ...template }) => {
      const previewPdfUrl = previewUrls[template.id] ?? null;

      return {
        ...template,
        previewType: "pdf",
        previewPdfUrl: previewPdfUrl ? `${previewPdfUrl}?v=${version}` : null,
      };
    });
    return successResponse(res, "Estimation templates fetched successfully", withPreviews);
  } catch (error) {
    console.error("getEstimationTemplates error:", error);
    return errorResponse(res, "Failed to fetch estimation templates", 500);
  }
};

export const printEstimations = async (req, res) => {
  try {
    const { search, status, customer_id } = req.query;
    const estimations = await getEstimationsModel({
      search: search || "",
      status: status || null,
      customer_id: customer_id || null,
    });

    const company = await getCompanySummaryModel();
    const estimationsWithItems = await attachItemsToEstimations(estimations);
    const summary = buildEstimationsSummary(estimations);

    return successResponse(res, "Estimations fetched successfully for print", {
      company,
      estimations: estimationsWithItems,
      summary,
    });
  } catch (error) {
    console.error("printEstimations error:", error);
    return errorResponse(res, "Failed to fetch estimations for print", 500);
  }
};

export const printEstimationById = async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationByIdModel(id);

    if (!estimation) {
      return errorResponse(res, "Estimation not found", 404);
    }

    const company = await getCompanySummaryModel();
    const response = await attachItemsAndSummary(estimation);

    // Mark each item with hasDiscount flag; compute whether ANY item has discount
    const itemsWithFlag = (response.items || []).map((item) => ({
      ...item,
      hasDiscount: toNumber(item.discountPercent, 0) > 0,
    }));
    const anyDiscount = itemsWithFlag.some((item) => item.hasDiscount);

    return successResponse(res, "Estimation fetched successfully for print", {
      company,
      estimation: {
        ...response,
        items: itemsWithFlag,
        anyDiscount,
      },
    });
  } catch (error) {
    console.error("printEstimationById error:", error);
    return errorResponse(res, "Failed to fetch estimation for print", 500);
  }
};

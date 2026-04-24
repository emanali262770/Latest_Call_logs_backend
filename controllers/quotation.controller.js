import { db } from "../config/db.js";
import {
  createQuotationHeaderModel,
  createQuotationItemsModel,
  deleteQuotationItemsModel,
  deleteQuotationModel,
  getNextBaseRevisionIdModel,
  getNextQuotationNoModel,
  getNextRevisionNumberModel,
  getQuotationByIdModel,
  getQuotationByRevisionIdModel,
  getQuotationItemsByQuotationIdModel,
  getQuotationsModel,
  updateQuotationHeaderModel,
} from "../model/quotation.model.js";
import { getCustomerByIdModel } from "../model/customer.model.js";
import { getServiceByIdModel } from "../model/service.model.js";
import { getItemRateByIdModel } from "../model/itemRate.model.js";
import { getCompanySummaryModel } from "../model/company.model.js";
import { sendQuotationDelivery } from "../services/quotationDelivery.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const letterCodes = {
  Letter: "LTR",
  Quotation: "QUT",
  Bill: "BLL",
  Invoice: "INV",
};

const toNullable = (value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value;
};

const toNumber = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
};

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const normalizeLetterType = (value) => {
  const normalized = toNullable(value) ?? "Quotation";
  return letterCodes[normalized] ? normalized : null;
};

const normalizeTaxMode = (value) => {
  const normalized = toNullable(value);
  return normalized === "withTax" || normalized === "withoutTax" ? normalized : null;
};

const buildSummary = (items, taxMode) => ({
  totalQty: roundMoney(items.reduce((sum, item) => sum + toNumber(item.qty), 0)),
  subTotal: roundMoney(items.reduce((sum, item) => sum + toNumber(item.total), 0)),
  gstTotal:
    taxMode === "withTax"
      ? roundMoney(items.reduce((sum, item) => sum + toNumber(item.gst_amount) * toNumber(item.qty), 0))
      : 0,
  grandTotal: roundMoney(
    items.reduce(
      (sum, item) =>
        sum +
        (taxMode === "withTax"
          ? toNumber(item.total_with_gst)
          : toNumber(item.total)),
      0
    )
  ),
});

const normalizeItems = async (items, taxMode) => {
  if (!Array.isArray(items) || !items.length) {
    return { error: "At least one item is required" };
  }

  const normalizedItems = [];

  for (const rawItem of items) {
    const itemRateId = toNullable(rawItem.itemRateId ?? rawItem.item_rate_id);
    const qty = toNumber(rawItem.qty, 0);

    if (!itemRateId) {
      return { error: "Each item must include itemRateId" };
    }

    if (qty <= 0) {
      return { error: "Each item qty must be greater than 0" };
    }

    const itemRate = await getItemRateByIdModel(itemRateId);
    if (!itemRate) {
      return { error: `Item rate not found for itemRateId ${itemRateId}` };
    }

    const rate = roundMoney(toNumber(rawItem.rate, toNumber(itemRate.salePrice, 0)));
    const total = roundMoney(rate * qty);
    const gstPercent = taxMode === "withTax" ? toNumber(rawItem.gstPercent ?? rawItem.gst_percent, 18) : 0;
    const gstAmount = taxMode === "withTax" ? roundMoney((rate * gstPercent) / 100) : 0;
    const rateWithGst = taxMode === "withTax" ? roundMoney(rate + gstAmount) : rate;
    const totalWithGst = taxMode === "withTax" ? roundMoney(rateWithGst * qty) : total;

    normalizedItems.push({
      item_rate_id: itemRateId,
      item_name: toNullable(rawItem.itemName ?? rawItem.item_name) ?? itemRate.item ?? null,
      rate,
      qty,
      description: toNullable(rawItem.description) ?? itemRate.itemSpecification ?? null,
      total,
      gst_percent: gstPercent,
      gst_amount: gstAmount,
      rate_with_gst: rateWithGst,
      total_with_gst: totalWithGst,
    });
  }

  return { items: normalizedItems };
};

const buildQuotationPayload = async (body, existing = null) => {
  const quotationDate = toNullable(body.quotationDate ?? body.quotation_date) ?? existing?.quotationDate;
  if (!quotationDate) {
    return { error: "quotationDate is required" };
  }

  const letterType = normalizeLetterType(body.letterType ?? body.letter_type ?? existing?.letterType);
  if (!letterType) {
    return { error: "letterType is invalid" };
  }

  const taxMode = normalizeTaxMode(body.taxMode ?? body.tax_mode ?? existing?.taxMode);
  if (!taxMode) {
    return { error: "taxMode is required" };
  }

  const customerId = toNullable(body.customerId ?? body.customer_id ?? existing?.customerId);
  if (!customerId) {
    return { error: "customerId is required" };
  }

  const customer = await getCustomerByIdModel(customerId);
  if (!customer) {
    return { error: "Customer not found", statusCode: 404 };
  }

  const serviceId = toNullable(body.serviceId ?? body.service_id ?? existing?.serviceId);
  let serviceName = null;
  if (serviceId) {
    const service = await getServiceByIdModel(serviceId);
    if (!service) {
      return { error: "Service not found", statusCode: 404 };
    }
    serviceName = service.service_name;
  }

  const normalized = await normalizeItems(body.items, taxMode);
  if (normalized.error) {
    return normalized;
  }

  const summary = buildSummary(normalized.items, taxMode);

  return {
    payload: {
      quotation_date: quotationDate,
      customer_id: customer.id,
      customer_name: customer.company,
      person: customer.person,
      designation: customer.designation,
      department: customer.department,
      estimation_id: toNullable(body.estimationId ?? body.estimation_id),
      service_id: serviceId,
      service_name: serviceName,
      letter_type: letterType,
      tax_mode: taxMode,
      items: normalized.items,
      summary,
      status: body.status ?? existing?.status ?? "active",
    },
  };
};

const attachItemsAndSummary = async (quotation) => {
  if (!quotation) return null;

  const items = await getQuotationItemsByQuotationIdModel(quotation.id);
  return {
    ...quotation,
    isRevision: Boolean(quotation.isRevision),
    items,
    summary: {
      totalQty: toNumber(quotation.totalQty, 0),
      subTotal: toNumber(quotation.subTotal, 0),
      gstTotal: toNumber(quotation.gstTotal, 0),
      grandTotal: toNumber(quotation.grandTotal, 0),
    },
  };
};

const buildDeliveryOptions = (body) => ({
  sendEmail: body.sendEmail === true || body.send_email === true,
  sendWhatsapp:
    body.sendWhatsapp === false || body.send_whatsapp === false
      ? false
      : true,
});

const attachDelivery = async (quotation, body) => {
  const options = buildDeliveryOptions(body);
  const delivery = await sendQuotationDelivery({
    quotation,
    ...options,
  });

  return {
    ...quotation,
    delivery,
  };
};

export const getNextQuotationNo = async (req, res) => {
  try {
    const letterType = normalizeLetterType(req.query.letterType);
    if (!letterType) {
      return errorResponse(res, "letterType is invalid", 400);
    }

    const quotationNo = await getNextQuotationNoModel(letterCodes[letterType]);
    return successResponse(res, "Next quotation number fetched successfully", {
      quotationNo,
    });
  } catch (error) {
    console.error("getNextQuotationNo error:", error);
    return errorResponse(res, "Failed to fetch next quotation number", 500);
  }
};

export const getNextRevisionId = async (req, res) => {
  try {
    const revisionId = await getNextBaseRevisionIdModel();
    return successResponse(res, "Next revision ID fetched successfully", {
      revisionId,
    });
  } catch (error) {
    console.error("getNextRevisionId error:", error);
    return errorResponse(res, "Failed to fetch next revision ID", 500);
  }
};

export const createQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const prepared = await buildQuotationPayload(req.body);
    if (prepared.error) {
      return errorResponse(res, prepared.error, prepared.statusCode ?? 400);
    }

    const quotationNo = await getNextQuotationNoModel(
      letterCodes[prepared.payload.letter_type]
    );
    const revisionId = await getNextBaseRevisionIdModel();

    await connection.beginTransaction();

    const headerResult = await createQuotationHeaderModel(connection, {
      ...prepared.payload,
      quotation_no: quotationNo,
      revision_id: revisionId,
      base_revision_id: revisionId,
      revision_no: 0,
      parent_quotation_id: null,
      is_revision: false,
      created_by: req.user?.id ?? null,
      total_qty: prepared.payload.summary.totalQty,
      sub_total: prepared.payload.summary.subTotal,
      gst_total: prepared.payload.summary.gstTotal,
      grand_total: prepared.payload.summary.grandTotal,
    });

    await createQuotationItemsModel(
      connection,
      headerResult.insertId,
      prepared.payload.items
    );

    await connection.commit();

    const created = await getQuotationByIdModel(headerResult.insertId);
    const quotation = await attachItemsAndSummary(created);
    const response = await attachDelivery(quotation, req.body);
    return successResponse(res, "Quotation created successfully", response, 201);
  } catch (error) {
    await connection.rollback();
    console.error("createQuotation error:", error);
    return errorResponse(res, "Failed to create quotation", 500);
  } finally {
    connection.release();
  }
};

export const getQuotations = async (req, res) => {
  try {
    const quotations = await getQuotationsModel({
      search: req.query.search || "",
      status: req.query.status || null,
      customer_id: req.query.customer_id || req.query.customerId || null,
    });

    const records = await Promise.all(quotations.map(attachItemsAndSummary));
    return successResponse(res, "Quotations fetched successfully", {
      records: records.length,
      quotations: records,
    });
  } catch (error) {
    console.error("getQuotations error:", error);
    return errorResponse(res, "Failed to fetch quotations", 500);
  }
};

export const getQuotationById = async (req, res) => {
  try {
    const quotation = await getQuotationByIdModel(req.params.id);
    if (!quotation) {
      return errorResponse(res, "Quotation not found", 404);
    }

    const response = await attachItemsAndSummary(quotation);
    return successResponse(res, "Quotation fetched successfully", response);
  } catch (error) {
    console.error("getQuotationById error:", error);
    return errorResponse(res, "Failed to fetch quotation", 500);
  }
};

export const getQuotationByRevisionId = async (req, res) => {
  try {
    const quotation = await getQuotationByRevisionIdModel(req.params.revisionId);
    if (!quotation) {
      return errorResponse(res, "Quotation revision not found", 404);
    }

    const response = await attachItemsAndSummary(quotation);
    return successResponse(res, "Quotation revision fetched successfully", response);
  } catch (error) {
    console.error("getQuotationByRevisionId error:", error);
    return errorResponse(res, "Failed to fetch quotation revision", 500);
  }
};

export const reviseQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const source = await getQuotationByIdModel(req.params.id);
    if (!source) {
      return errorResponse(res, "Quotation not found", 404);
    }

    const prepared = await buildQuotationPayload(req.body, source);
    if (prepared.error) {
      return errorResponse(res, prepared.error, prepared.statusCode ?? 400);
    }

    const baseRevisionId = source.baseRevisionId || source.revisionId.split("-")[0];
    const nextRevisionNo = await getNextRevisionNumberModel(baseRevisionId);
    const revisionId = `${baseRevisionId}-${nextRevisionNo}`;

    await connection.beginTransaction();

    const headerResult = await createQuotationHeaderModel(connection, {
      ...prepared.payload,
      quotation_no: source.quotationNo,
      revision_id: revisionId,
      base_revision_id: baseRevisionId,
      revision_no: nextRevisionNo,
      parent_quotation_id: source.id,
      is_revision: true,
      created_by: req.user?.id ?? null,
      total_qty: prepared.payload.summary.totalQty,
      sub_total: prepared.payload.summary.subTotal,
      gst_total: prepared.payload.summary.gstTotal,
      grand_total: prepared.payload.summary.grandTotal,
    });

    await createQuotationItemsModel(
      connection,
      headerResult.insertId,
      prepared.payload.items
    );

    await connection.commit();

    const revised = await getQuotationByIdModel(headerResult.insertId);
    const quotation = await attachItemsAndSummary(revised);
    const response = await attachDelivery(quotation, req.body);
    return successResponse(res, "Quotation revised successfully", response, 201);
  } catch (error) {
    await connection.rollback();
    console.error("reviseQuotation error:", error);
    return errorResponse(res, "Failed to revise quotation", 500);
  } finally {
    connection.release();
  }
};

export const updateQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const existing = await getQuotationByIdModel(req.params.id);
    if (!existing) {
      return errorResponse(res, "Quotation not found", 404);
    }

    const prepared = await buildQuotationPayload(req.body, existing);
    if (prepared.error) {
      return errorResponse(res, prepared.error, prepared.statusCode ?? 400);
    }

    const nextQuotationNo =
      prepared.payload.letter_type === existing.letterType
        ? existing.quotationNo
        : await getNextQuotationNoModel(letterCodes[prepared.payload.letter_type]);

    await connection.beginTransaction();

    await updateQuotationHeaderModel(connection, existing.id, {
      ...prepared.payload,
      quotation_no: nextQuotationNo,
      total_qty: prepared.payload.summary.totalQty,
      sub_total: prepared.payload.summary.subTotal,
      gst_total: prepared.payload.summary.gstTotal,
      grand_total: prepared.payload.summary.grandTotal,
    });

    await deleteQuotationItemsModel(connection, existing.id);
    await createQuotationItemsModel(connection, existing.id, prepared.payload.items);

    await connection.commit();

    const updated = await getQuotationByIdModel(existing.id);
    const quotation = await attachItemsAndSummary(updated);
    const response = await attachDelivery(quotation, req.body);
    return successResponse(res, "Quotation updated successfully", response);
  } catch (error) {
    await connection.rollback();
    console.error("updateQuotation error:", error);
    return errorResponse(res, "Failed to update quotation", 500);
  } finally {
    connection.release();
  }
};

export const sendQuotation = async (req, res) => {
  try {
    const quotation = await getQuotationByIdModel(req.params.id);
    if (!quotation) {
      return errorResponse(res, "Quotation not found", 404);
    }

    const quotationWithItems = await attachItemsAndSummary(quotation);
    const response = await attachDelivery(quotationWithItems, {
      sendEmail: req.body.email === true || req.body.sendEmail === true,
      sendWhatsapp: req.body.whatsapp === true || req.body.sendWhatsapp === true,
    });

    return successResponse(res, "Quotation delivery processed", response.delivery);
  } catch (error) {
    console.error("sendQuotation error:", error);
    return errorResponse(res, "Failed to send quotation", 500);
  }
};

export const printQuotationById = async (req, res) => {
  try {
    const quotation = await getQuotationByIdModel(req.params.id);
    if (!quotation) {
      return errorResponse(res, "Quotation not found", 404);
    }

    const company = await getCompanySummaryModel();
    const quotationWithItems = await attachItemsAndSummary(quotation);
    return successResponse(res, "Quotation fetched successfully for print", {
      company,
      quotation: {
        ...quotationWithItems,
        company: quotationWithItems.customerName,
        forProduct: quotationWithItems.serviceName,
        taxMode:
          quotationWithItems.taxMode === "withTax" ? "With Tax" : "Without Tax",
      },
    });
  } catch (error) {
    console.error("printQuotationById error:", error);
    return errorResponse(res, "Failed to fetch quotation for print", 500);
  }
};

export const deleteQuotation = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const existing = await getQuotationByIdModel(req.params.id);
    if (!existing) {
      return errorResponse(res, "Quotation not found", 404);
    }

    await connection.beginTransaction();
    await deleteQuotationModel(connection, existing.id);
    await connection.commit();

    return successResponse(res, "Quotation deleted successfully");
  } catch (error) {
    await connection.rollback();
    console.error("deleteQuotation error:", error);
    return errorResponse(res, "Failed to delete quotation", 500);
  } finally {
    connection.release();
  }
};

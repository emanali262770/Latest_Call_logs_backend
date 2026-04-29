import express from "express";
import {
  createQuotation,
  deleteQuotation,
  getNextQuotationNo,
  getNextRevisionId,
  getQuotationById,
  getQuotationByRevisionId,
  getQuotationTemplates,
  getQuotations,
  printQuotationHtml,
  printQuotationById,
  printQuotationPdf,
  reviseQuotation,
  sendQuotation,
  updateQuotation,
} from "../controllers/quotation.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/next-number",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getNextQuotationNo
);

router.get(
  "/next-revision",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getNextRevisionId
);

router.get(
  "/print-templates",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getQuotationTemplates
);

router.get(
  "/revisions/:revisionId",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getQuotationByRevisionId
);

router.post(
  "/",
  protect,
  checkPermission("INVENTORY.QUOTATION.CREATE"),
  createQuotation
);

router.get(
  "/",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getQuotations
);

router.get(
  "/:id",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  getQuotationById
);

router.get(
  "/:id/print",
  protect,
  checkPermission("INVENTORY.QUOTATION.PRINT"),
  printQuotationById
);

router.get(
  "/:id/print-html",
  protect,
  checkPermission("INVENTORY.QUOTATION.PRINT"),
  printQuotationHtml
);

router.get(
  "/:id/print-pdf",
  protect,
  checkPermission("INVENTORY.QUOTATION.PRINT"),
  printQuotationPdf
);

router.post(
  "/:id/revise",
  protect,
  checkPermission("INVENTORY.QUOTATION.CREATE"),
  reviseQuotation
);

router.post(
  "/:id/send",
  protect,
  checkPermission("INVENTORY.QUOTATION.READ"),
  sendQuotation
);

router.put(
  "/:id",
  protect,
  checkPermission("INVENTORY.QUOTATION.UPDATE"),
  updateQuotation
);

router.delete(
  "/:id",
  protect,
  checkPermission("INVENTORY.QUOTATION.DELETE"),
  deleteQuotation
);

export default router;

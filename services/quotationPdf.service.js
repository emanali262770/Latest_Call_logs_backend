import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import { getCompanySummaryModel } from "../model/company.model.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const quotationPdfDirectory = path.join(projectRoot, "uploads", "quotations");

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const text = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ensureDirectory = async () => {
  await fsPromises.mkdir(quotationPdfDirectory, { recursive: true });
};

const page = {
  left: 40,
  right: 555,
  width: 515,
};

const drawLabelValue = (doc, label, value, x, y, width) => {
  doc
    .fontSize(6.8)
    .fillColor("#64748b")
    .font("Helvetica-Bold")
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 1.4 });
  doc
    .fontSize(9.2)
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .text(text(value), x, y + 14, { width, lineGap: 2 });
};

const drawDocumentTitle = (doc, quotation) => {
  const y = 130;
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0f172a")
    .text("Quotation", page.left, y, { width: 250 });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#475569")
    .text(`Prepared for ${text(quotation.customerName)}`, page.left, y + 24, {
      width: 250,
    });

  const metaX = 395;
  const labelWidth = 65;
  const valueWidth = 95;
  const metaRows = [
    ["Quotation No", quotation.quotationNo],
    ["Revision Ref", quotation.revisionId],
    ["Date", formatDate(quotation.quotationDate)],
    ["Printed", new Date().toLocaleDateString("en-GB")],
  ];

  metaRows.forEach(([label, value], index) => {
    const rowY = y + index * 16;
    doc.font("Helvetica-Bold").fontSize(7.2).fillColor("#64748b").text(label, metaX, rowY, {
      width: labelWidth,
      align: "right",
    });
    doc.font("Helvetica-Bold").fontSize(8.2).fillColor("#0f172a").text(text(value), metaX + 75, rowY, {
      width: valueWidth,
      align: "right",
    });
  });

  doc.moveTo(page.left, y + 70).lineTo(page.right, y + 70).lineWidth(0.8).strokeColor("#cbd5e1").stroke();
};

const drawDetailsSection = (doc, quotation) => {
  const y = 220;
  const columnWidth = 235;
  const rightX = 320;

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("CLIENT DETAILS", page.left, y, {
    characterSpacing: 1.2,
  });
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("PROJECT DETAILS", rightX, y, {
    characterSpacing: 1.2,
  });

  doc.moveTo(page.left, y + 18).lineTo(275, y + 18).lineWidth(0.7).strokeColor("#94a3b8").stroke();
  doc.moveTo(rightX, y + 18).lineTo(page.right, y + 18).stroke();

  drawLabelValue(doc, "Customer", quotation.customerName, page.left, y + 34, columnWidth);
  drawLabelValue(doc, "Contact Person", quotation.person, page.left, y + 74, columnWidth);
  drawLabelValue(doc, "Designation", quotation.designation, page.left, y + 114, columnWidth);

  drawLabelValue(doc, "Service", quotation.serviceName, rightX, y + 34, columnWidth);
  drawLabelValue(doc, "Department", quotation.department, rightX, y + 74, columnWidth);
  drawLabelValue(doc, "Tax Mode", quotation.taxMode === "withTax" ? "With Tax" : "Without Tax", rightX, y + 114, columnWidth);
};

const drawItemsTable = (doc, quotation) => {
  const x = page.left;
  let y = 390;
  const tableWidth = page.width;
  const headerHeight = 24;
  const rowHeight = 30;
  const columns =
    quotation.taxMode === "withTax"
      ? [
          ["Sr.", 30, "left"],
          ["Description", 170, "left"],
          ["Rate", 65, "right"],
          ["Qty", 45, "right"],
          ["GST", 60, "right"],
          ["Rate+GST", 70, "right"],
          ["Amount", 75, "right"],
        ]
      : [
          ["Sr.", 30, "left"],
          ["Description", 245, "left"],
          ["Rate", 75, "right"],
          ["Qty", 55, "right"],
          ["Amount", 110, "right"],
        ];

  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("LINE ITEMS", x, y - 22, {
    characterSpacing: 1.2,
  });

  doc.rect(x, y, tableWidth, headerHeight).fill("#0f172a");
  let currentX = x;
  columns.forEach(([label, width, align]) => {
    doc
      .fillColor("#ffffff")
      .font("Helvetica-Bold")
      .fontSize(7.2)
      .text(label.toUpperCase(), currentX + 8, y + 8, {
        width: width - 16,
        align,
        characterSpacing: 0.6,
      });
    currentX += width;
  });

  y += headerHeight;
  quotation.items.forEach((item, index) => {
    if (index % 2 === 1) {
      doc.rect(x, y, tableWidth, rowHeight).fill("#f8fafc");
    }
    doc.moveTo(x, y + rowHeight).lineTo(x + tableWidth, y + rowHeight).lineWidth(0.4).strokeColor("#dbe3ec").stroke();

    const values =
      quotation.taxMode === "withTax"
        ? [
            index + 1,
            item.itemName,
            money(item.rate),
            money(item.qty),
            money(item.gstAmount),
            money(item.rateWithGst),
            money(item.totalWithGst),
          ]
        : [
            index + 1,
            item.itemName,
            money(item.rate),
            money(item.qty),
            money(item.total),
          ];

    currentX = x;
    columns.forEach(([, width, align], columnIndex) => {
      const isDescription = columnIndex === 1;
      doc
        .fillColor(isDescription ? "#0f172a" : "#334155")
        .font(isDescription ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8)
        .text(text(values[columnIndex]), currentX + 8, y + 10, {
          width: width - 16,
          align,
          lineBreak: false,
          ellipsis: true,
        });
      currentX += width;
    });
    y += rowHeight;
  });

  const summaryY = y + 22;
  const summaryX = 365;
  const summaryWidth = 190;

  doc.moveTo(summaryX, summaryY).lineTo(summaryX + summaryWidth, summaryY).lineWidth(0.8).strokeColor("#94a3b8").stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#475569").text("Total Quantity", summaryX, summaryY + 14, {
    width: 85,
  });
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text(money(quotation.summary.totalQty), summaryX + 95, summaryY + 14, {
    width: 95,
    align: "right",
  });

  doc.rect(summaryX, summaryY + 38, summaryWidth, 34).fill("#f1f5f9");
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#0f172a").text("Grand Total", summaryX + 12, summaryY + 51, {
    width: 80,
  });
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#0f172a").text(money(quotation.summary.grandTotal), summaryX + 92, summaryY + 49, {
    width: 86,
    align: "right",
  });

  return summaryY + 96;
};

const drawTerms = (doc, y) => {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#0f172a").text("NOTES", page.left, y, {
    characterSpacing: 1.2,
  });
  doc.moveTo(page.left, y + 16).lineTo(285, y + 16).lineWidth(0.7).strokeColor("#94a3b8").stroke();
  doc
    .font("Helvetica")
    .fontSize(7.6)
    .fillColor("#475569")
    .text(
      "This quotation is prepared based on the listed items and quantities. Prices are subject to confirmation at the time of order placement.",
      page.left,
      y + 30,
      { width: 245, lineGap: 3 }
    );
};

export const generateQuotationPdf = async (quotation) => {
  await ensureDirectory();

  const company = await getCompanySummaryModel();
  const safeQuotationNo = String(quotation.quotationNo || quotation.id).replace(/[^\w-]/g, "-");
  const fileName = `${safeQuotationNo}-${Date.now()}.pdf`;
  const filePath = path.join(quotationPdfDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.font("Helvetica-Bold").fontSize(7).fillColor("#4f46e5").text("QUOTATION PRINT", page.left, 52, {
    characterSpacing: 2,
  });
  doc
    .fontSize(15)
    .fillColor("#0f172a")
    .text(company?.company_name || "Afaq Technologies", page.left, 67);

  doc.moveTo(page.left, 112).lineTo(page.right, 112).lineWidth(2).strokeColor("#4f46e5").stroke();

  drawDocumentTitle(doc, quotation);
  drawDetailsSection(doc, quotation);
  const afterTableY = drawItemsTable(doc, quotation);
  drawTerms(doc, Math.min(afterTableY, 665));

  doc
    .moveTo(page.left, 760)
    .lineTo(page.right, 760)
    .lineWidth(0.5)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.fontSize(7).font("Helvetica").fillColor("#64748b");
  doc.text(`Prepared by ${company?.company_name || "Afaq Technologies"}`, page.left, 775);
  doc.text(text(quotation.quotationNo), 470, 775, { width: 85, align: "right" });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = `/uploads/quotations/${fileName}`;
  return { filePath, fileName, publicUrl };
};

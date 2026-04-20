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

const drawLabelValue = (doc, label, value, x, y, width) => {
  doc
    .fontSize(7)
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 2 });
  doc
    .fontSize(9)
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .text(text(value), x, y + 16, { width });
};

const drawDetailsBox = (doc, quotation) => {
  const x = 35;
  const y = 198;
  const width = 525;
  const rowHeight = 52;
  const half = width / 2;

  doc.roundedRect(x, y, width, rowHeight * 2 + 36, 6).strokeColor("#cbd5e1").stroke();
  doc
    .fontSize(7)
    .fillColor("#111827")
    .font("Helvetica-Bold")
    .text("Q U O T A T I O N   D E T A I L S", x + 14, y + 14);

  const startY = y + 36;
  doc.moveTo(x, startY).lineTo(x + width, startY).strokeColor("#cbd5e1").stroke();
  doc.moveTo(x + half, startY).lineTo(x + half, y + rowHeight * 2 + 36).stroke();
  doc.moveTo(x, startY + rowHeight).lineTo(x + width, startY + rowHeight).stroke();

  drawLabelValue(doc, "Customer", quotation.customerName, x + 14, startY + 12, half - 28);
  drawLabelValue(doc, "Service", quotation.serviceName, x + half + 14, startY + 12, half - 28);
  drawLabelValue(doc, "Person", quotation.person, x + 14, startY + rowHeight + 12, half - 28);
  drawLabelValue(
    doc,
    "Designation / Department",
    `${text(quotation.designation)} / ${text(quotation.department)}`,
    x + half + 14,
    startY + rowHeight + 12,
    half - 28
  );
};

const drawItemsTable = (doc, quotation) => {
  const x = 35;
  let y = 355;
  const rowHeight = 26;
  const columns =
    quotation.taxMode === "withTax"
      ? [
          ["Sr.", 25],
          ["Item", 150],
          ["Rate", 62],
          ["Qty", 42],
          ["GST", 62],
          ["Rate+GST", 78],
          ["Total", 106],
        ]
      : [
          ["Sr.", 25],
          ["Item", 190],
          ["Rate", 75],
          ["Qty", 50],
          ["Total", 95],
          ["Status", 90],
        ];

  doc.rect(x, y, 525, rowHeight).fillAndStroke("#f8fafc", "#94a3b8");
  doc.fillColor("#111827").fontSize(8).font("Helvetica-Bold");

  let currentX = x;
  columns.forEach(([label, width]) => {
    doc.text(label, currentX + 5, y + 9, { width: width - 10 });
    currentX += width;
  });

  y += rowHeight;
  quotation.items.forEach((item, index) => {
    doc.rect(x, y, 525, rowHeight).strokeColor("#94a3b8").stroke();
    doc.fillColor("#111827").fontSize(8).font("Helvetica");

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
            quotation.status?.toUpperCase() || "ACTIVE",
          ];

    currentX = x;
    columns.forEach(([, width], columnIndex) => {
      doc.text(text(values[columnIndex]), currentX + 5, y + 9, {
        width: width - 10,
      });
      currentX += width;
    });
    y += rowHeight;
  });

  y += 14;
  doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827");
  doc.text(`Total Qty: ${money(quotation.summary.totalQty)}`, 350, y, {
    width: 95,
    align: "right",
  });
  doc.text(`Grand Total: ${money(quotation.summary.grandTotal)}`, 445, y, {
    width: 115,
    align: "right",
  });
};

export const generateQuotationPdf = async (quotation) => {
  await ensureDirectory();

  const company = await getCompanySummaryModel();
  const safeQuotationNo = String(quotation.quotationNo || quotation.id).replace(/[^\w-]/g, "-");
  const fileName = `${safeQuotationNo}-${Date.now()}.pdf`;
  const filePath = path.join(quotationPdfDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 35 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.font("Helvetica-Bold").fontSize(7).fillColor("#4f46e5").text("QUOTATION PRINT", 35, 65, {
    characterSpacing: 2,
  });
  doc
    .fontSize(15)
    .fillColor("#111827")
    .text(company?.company_name || "Afaq Technologies", 35, 80);

  doc.moveTo(35, 130).lineTo(560, 130).lineWidth(2).strokeColor("#4f46e5").stroke();
  doc.fontSize(14).fillColor("#111827").font("Helvetica-Bold");
  doc.text(`Quotation - ${quotation.quotationNo}`, 35, 158);
  doc.fontSize(8).font("Helvetica").text(text(quotation.customerName), 35, 176);

  doc.fontSize(8).font("Helvetica-Bold").text("Printed", 500, 150, {
    width: 60,
    align: "right",
  });
  doc.font("Helvetica").text(new Date().toLocaleString(), 430, 164, {
    width: 130,
    align: "right",
  });
  doc.font("Helvetica-Bold").text(`Ref: ${quotation.revisionId}`, 430, 178, {
    width: 130,
    align: "right",
  });

  doc.font("Helvetica-Bold").fontSize(10).text(formatDate(quotation.quotationDate), 35, 185);

  drawDetailsBox(doc, quotation);
  drawItemsTable(doc, quotation);

  doc
    .moveTo(35, 760)
    .lineTo(560, 760)
    .lineWidth(0.5)
    .strokeColor("#cbd5e1")
    .stroke();
  doc.fontSize(7).font("Helvetica").fillColor("#111827");
  doc.text(`Single Quotation Record - ${company?.company_name || "Afaq Technologies"}`, 35, 775);
  doc.text(text(quotation.quotationNo), 500, 775, { width: 60, align: "right" });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = `/uploads/quotations/${fileName}`;
  return { filePath, fileName, publicUrl };
};

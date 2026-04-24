import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const quotationPdfDirectory = path.join(projectRoot, "uploads", "quotations");

const PAGE = {
  width: 595.28,
  height: 841.89,
  left: 45.35,
  right: 549.93,
  contentWidth: 504.58,
};

const COLORS = {
  text: "#1a1a1a",
  muted: "#555555",
  soft: "#888888",
  softest: "#aaaaaa",
  border: "#cccccc",
  lightBorder: "#e8e8e8",
  lighter: "#eeeeee",
  tableHeader: "#f2f2f2",
  altRow: "#fafafa",
  white: "#ffffff",
};

const STATIC_COMPANY_PROFILE = {
  name: "Infinity Byte Solution",
  address: "Abid Majeed Road, Lahore Cantt, Lahore",
  contact: "Attn: M. Anas (IT Dept)",
};

const TERMS = [
  "Quoted prices are valid for 30 days from the date of this quotation.",
  "Delivery / execution schedule will be confirmed upon receipt of formal Purchase Order.",
  "All applicable government taxes (GST, WHT) will be charged as per prevailing laws unless stated above.",
  "Payment terms: 50% advance with PO; remaining balance before delivery / handover.",
  "Installation, cabling, civil works, and consumables not explicitly listed are excluded.",
  "Warranty as per respective manufacturer's standard policy unless otherwise specified.",
  "Any change in scope of work may result in a revised quotation before execution.",
  "This quotation supersedes all previous verbal or written communications on the same subject.",
  "Force majeure events (natural disasters, strikes, etc.) shall not be the liability of the vendor.",
  "All disputes, if any, shall be subject to the exclusive jurisdiction of Lahore courts.",
];

const ensureDirectory = async () => {
  await fsPromises.mkdir(quotationPdfDirectory, { recursive: true });
};

const v = (value, fallback = "-") => {
  const s = String(value ?? "").trim();
  return s || fallback;
};

const formatMoney = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return v(value);
  return n.toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (value, options = { day: "2-digit", month: "short", year: "numeric" }) => {
  const s = String(value || "").trim();
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-GB", options);
};

const normalizeItem = (item) => {
  const rate = Number(item?.rate ?? item?.price ?? item?.salePrice ?? item?.sale_price ?? 0);
  const qty = Number(item?.qty ?? 0);
  const amount = Number(item?.total ?? item?.amount ?? rate * qty);
  const gstPercent = Number(item?.gstPercent ?? item?.gst_percent ?? 0);
  const gstAmount = Number(item?.gstAmount ?? item?.gst_amount ?? 0);
  const rateWithGst = Number(item?.rateWithGst ?? item?.rate_with_gst ?? rate);
  const totalWithGst = Number(item?.totalWithGst ?? item?.total_with_gst ?? amount);

  return {
    description: v(item?.description || item?.itemName || item?.item_name || item?.item),
    rate,
    qty,
    amount,
    gstPercent,
    gstAmount,
    rateWithGst,
    totalWithGst,
  };
};

const normalizeQuotation = (quotation) => {
  const items = Array.isArray(quotation?.items) ? quotation.items.map(normalizeItem) : [];
  const isWithTax = /^with\s*tax$/i.test(String(quotation?.taxMode || quotation?.tax_mode || "").trim());
  const calculatedQty = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const calculatedGrandTotal = items.reduce(
    (sum, item) => sum + Number(isWithTax ? item.totalWithGst : item.amount),
    0
  );

  return {
    quotationNo: v(quotation?.quotationNo || quotation?.quotation_no),
    revisionId: v(quotation?.revisionId || quotation?.revision_id),
    quotationDate: quotation?.quotationDate || quotation?.quotation_date || quotation?.date,
    customerName: v(
      quotation?.company ||
        quotation?.customerName ||
        quotation?.customer_name ||
        quotation?.customer?.company
    ),
    person: v(quotation?.person || quotation?.customerPerson || quotation?.customer_person),
    designation: v(
      quotation?.designation ||
        quotation?.customerDesignation ||
        quotation?.customer_designation
    ),
    serviceName: v(
      quotation?.forProduct ||
        quotation?.serviceName ||
        quotation?.service_name ||
        quotation?.service?.serviceName
    ),
    department: v(
      quotation?.department ||
        quotation?.customerDepartment ||
        quotation?.customer_department
    ),
    taxMode: v(quotation?.taxMode || quotation?.tax_mode),
    items,
    totalQty: Number(quotation?.summary?.totalQty ?? quotation?.totalQty ?? calculatedQty),
    grandTotal: Number(quotation?.summary?.grandTotal ?? quotation?.grandTotal ?? calculatedGrandTotal),
  };
};

const isWithTaxMode = (quotation) =>
  /^with\s*tax$/i.test(String(quotation?.taxMode || "").trim());

const mm = (value) => value * 2.83464567;
const pt = (value) => value;

const drawTopAccent = (doc) => {
  doc.save();
  doc.rect(0, 0, PAGE.width, pt(3.5)).fill(COLORS.text);
  doc.restore();
};

const drawHeader = (doc, quotation) => {
  const leftX = PAGE.left + mm(16) - PAGE.left;
  const contentX = mm(16);
  const topY = mm(7) + pt(3.5);
  const rightBlockX = 392;
  const rightBlockWidth = 158;

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.text)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), contentX, topY, {
      width: 270,
      lineGap: 0,
    });

  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(COLORS.soft)
    .text("IT SOLUTIONS & SERVICES", contentX, topY + 20, {
      width: 220,
      characterSpacing: 1.8,
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(STATIC_COMPANY_PROFILE.address, contentX, topY + 31, {
      width: 245,
      lineGap: 2,
    });

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.softest)
    .text("QUOTATION", rightBlockX, topY + 2, {
      width: rightBlockWidth,
      align: "right",
      characterSpacing: 2.2,
    });

  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(COLORS.text)
    .text(v(quotation.quotationNo), rightBlockX, topY + 16, {
      width: rightBlockWidth,
      align: "right",
      lineBreak: false,
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }),
      rightBlockX,
      topY + 33,
      {
        width: rightBlockWidth,
        align: "right",
        lineBreak: false,
      }
    );

  doc
    .moveTo(contentX, 82)
    .lineTo(PAGE.right - mm(16), 82)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();
};

const drawBodyStart = (doc) => {
  return {
    x: mm(16),
    y: 96,
    width: PAGE.width - mm(32),
  };
};

const drawSubjectAttention = (doc, quotation, startY) => {
  const x = mm(16);
  const totalWidth = PAGE.width - mm(32);
  const blockWidth = (totalWidth - 10) / 2;
  const dividerX = x + blockWidth + 5;

  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.soft)
    .text("SUBJECT", x, startY, { characterSpacing: 1.6 });

  doc
    .font("Helvetica-Bold")
    .fontSize(9.5)
    .fillColor(COLORS.text)
    .text(`Quotation for ${v(quotation.serviceName)}`, x, startY + 11, {
      width: blockWidth - 14,
    });

  doc
    .moveTo(dividerX, startY)
    .lineTo(dividerX, startY + 34)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();

  const attnX = dividerX + 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.soft)
    .text("ATTENTION", attnX, startY, { characterSpacing: 1.6 });

  if (quotation.person !== "-") {
    const line =
      quotation.designation !== "-"
        ? `${quotation.person} - ${quotation.designation}`
        : quotation.person;
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.text)
      .text(line, attnX, startY + 11, { width: blockWidth - 10 });
  }

  if (quotation.department !== "-") {
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(quotation.department, attnX, startY + 24, { width: blockWidth - 10 });
  }

  return startY + 50;
};

const drawSectionHeader = (doc, label, y) => {
  const x = mm(16);
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor(COLORS.text)
    .text(label.toUpperCase(), x, y, { characterSpacing: 1.9 });

  const lineStart = x + 108;
  doc
    .moveTo(lineStart, y + 4)
    .lineTo(PAGE.right - mm(16), y + 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();
};

const drawItemsTable = (doc, quotation, y) => {
  const isWithTax = isWithTaxMode(quotation);
  const x = mm(16);
  const tableWidth = PAGE.width - mm(32);
  const headerHeight = 24;
  const rowMinHeight = 26;
  const columns = isWithTax
    ? [
        { key: "sr", label: "#", width: 22.7, align: "center" },
        { key: "description", label: "Description", width: 165, align: "left" },
        { key: "rate", label: "Unit Rate", width: 73.7, align: "right" },
        { key: "qty", label: "Qty", width: 36.9, align: "right" },
        { key: "gstAmount", label: "GST Amt", width: 62.4, align: "right" },
        { key: "rateWithGst", label: "Rate + GST", width: 73.7, align: "right" },
        { key: "totalWithGst", label: "Total", width: 70.18, align: "right" },
      ]
    : [
        { key: "sr", label: "#", width: 22.7, align: "center" },
        { key: "description", label: "Description", width: 279, align: "left" },
        { key: "rate", label: "Unit Rate", width: 73.7, align: "right" },
        { key: "qty", label: "Qty", width: 36.9, align: "right" },
        { key: "amount", label: "Total", width: 92.28, align: "right" },
      ];

  doc
    .rect(x, y, tableWidth, headerHeight)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();
  doc.rect(x, y, tableWidth, headerHeight).fill(COLORS.tableHeader);

  let currentX = x;
  columns.forEach((col, index) => {
    if (index > 0) {
      doc
        .moveTo(currentX, y)
        .lineTo(currentX, y + headerHeight)
        .lineWidth(0.75)
        .strokeColor("#dddddd")
        .stroke();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(COLORS.text)
      .text(col.label.toUpperCase(), currentX + 6, y + 8, {
        width: col.width - 12,
        align: col.align,
        characterSpacing: 0.8,
      });

    currentX += col.width;
  });

  doc
    .moveTo(x, y + headerHeight)
    .lineTo(x + tableWidth, y + headerHeight)
    .lineWidth(1.5)
    .strokeColor(COLORS.text)
    .stroke();

  let rowY = y + headerHeight;
  const items = quotation.items || [];

  if (!items.length) {
    doc
      .rect(x, rowY, tableWidth, rowMinHeight)
      .lineWidth(0.5)
      .strokeColor(COLORS.lightBorder)
      .stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#999999")
      .text("No line items found.", x, rowY + 9, {
        width: tableWidth,
        align: "center",
      });
    return rowY + rowMinHeight;
  }

  items.forEach((item, index) => {
    const descriptionHeight = doc.heightOfString(item.description, {
      width: columns[1].width - 12,
      align: "left",
    });
    const rowHeight = Math.max(rowMinHeight, Math.ceil(descriptionHeight + 12));

    if (index % 2 === 1) {
      doc.rect(x, rowY, tableWidth, rowHeight).fill(COLORS.altRow);
    }

    doc
      .rect(x, rowY, tableWidth, rowHeight)
      .lineWidth(0.5)
      .strokeColor(COLORS.lightBorder)
      .stroke();

    currentX = x;
    columns.forEach((col, colIndex) => {
      if (colIndex > 0) {
        doc
          .moveTo(currentX, rowY)
          .lineTo(currentX, rowY + rowHeight)
          .lineWidth(0.75)
          .strokeColor(COLORS.lightBorder)
          .stroke();
      }

      let value = "";
      if (col.key === "sr") value = String(index + 1);
      if (col.key === "description") value = item.description;
      if (col.key === "rate") value = formatMoney(item.rate);
      if (col.key === "qty") value = formatMoney(item.qty);
      if (col.key === "gstAmount") value = formatMoney(item.gstAmount);
      if (col.key === "rateWithGst") value = formatMoney(item.rateWithGst);
      if (col.key === "totalWithGst") value = formatMoney(item.totalWithGst);
      if (col.key === "amount") value = formatMoney(item.amount);

      doc
        .font(
          col.key === "description"
            ? "Helvetica-Bold"
            : col.key === "sr"
              ? "Helvetica"
              : "Courier"
        )
        .fontSize(col.key === "description" ? 8.5 : col.key === "sr" ? 8 : 8.2)
        .fillColor(col.key === "sr" ? "#999999" : COLORS.text)
        .text(value, currentX + 6, rowY + 7, {
          width: col.width - 12,
          align: col.align,
          lineBreak: col.key === "description",
          ellipsis: col.key === "description" ? false : true,
        });

      currentX += col.width;
    });

    rowY += rowHeight;
  });

  return rowY;
};

const drawTotals = (doc, quotation, startY) => {
  const isWithTax = isWithTaxMode(quotation);
  const boxWidth = mm(72);
  const tableRightX = mm(16) + (PAGE.width - mm(32));
  const boxX = tableRightX - boxWidth;
  const rowHeight = 20;
  let y = startY + 8;

  const rows = [];
  if (isWithTax) {
    rows.push([
      "Sub-Total (PKR)",
      formatMoney(quotation.items.reduce((s, i) => s + Number(i.amount || 0), 0)),
      false,
    ]);
    rows.push([
      "GST Amount (PKR)",
      formatMoney(quotation.items.reduce((s, i) => s + Number(i.gstAmount || 0), 0)),
      false,
    ]);
  }
  rows.push(["Grand Total (PKR)", formatMoney(quotation.grandTotal), true]);

  const totalHeight = rows.reduce((sum, row) => sum + (row[2] ? 24 : rowHeight), 0);
  doc.rect(boxX, y, boxWidth, totalHeight).lineWidth(0.75).strokeColor(COLORS.border).stroke();

  rows.forEach(([label, value, grand], index) => {
    const h = grand ? 24 : rowHeight;
    if (grand) {
      doc.rect(boxX, y, boxWidth, h).fill(COLORS.tableHeader);
      doc
        .moveTo(boxX, y)
        .lineTo(boxX + boxWidth, y)
        .lineWidth(1.5)
        .strokeColor(COLORS.text)
        .stroke();
    } else if (index > 0) {
      doc
        .moveTo(boxX, y)
        .lineTo(boxX + boxWidth, y)
        .lineWidth(0.5)
        .strokeColor(COLORS.lightBorder)
        .stroke();
    }

    doc
      .font(grand ? "Helvetica-Bold" : "Helvetica")
      .fontSize(grand ? 7.5 : 7)
      .fillColor(grand ? COLORS.text : COLORS.soft)
      .text(String(label).toUpperCase(), boxX + 9, y + (grand ? 8 : 6.5), {
        width: 110,
        characterSpacing: grand ? 1 : 0.6,
      });

    doc
      .font(grand ? "Courier-Bold" : "Courier")
      .fontSize(grand ? 10 : 8.5)
      .fillColor(COLORS.text)
      .text(value, boxX + 118, y + (grand ? 7 : 6.5), {
        width: boxWidth - 127,
        align: "right",
      });

    y += h;
  });

  return startY + 8 + totalHeight;
};

const drawTerms = (doc, startY) => {
  drawSectionHeader(doc, "Terms & Conditions", startY);

  const leftX = mm(16);
  const rightX = leftX + 240;
  let leftY = startY + 16;
  let rightY = startY + 16;

  TERMS.forEach((term, index) => {
    const x = index % 2 === 0 ? leftX : rightX;
    const y = index % 2 === 0 ? leftY : rightY;
    const width = 226;

    doc.circle(x + 2.5, y + 8.5, 2.25).lineWidth(1.5).strokeColor(COLORS.text).stroke();
    doc
      .font("Helvetica")
      .fontSize(7.8)
      .fillColor("#444444")
      .text(term, x + 11, y + 1, {
        width: width - 14,
        lineGap: 2,
      });

    const textHeight = doc.heightOfString(term, {
      width: width - 14,
      lineGap: 2,
    });
    const rowHeight = Math.max(16, textHeight + 4);

    doc
      .moveTo(x, y + rowHeight + 2)
      .lineTo(x + width, y + rowHeight + 2)
      .lineWidth(0.5)
      .strokeColor(COLORS.lighter)
      .stroke();

    if (index % 2 === 0) {
      leftY += rowHeight + 6;
    } else {
      rightY += rowHeight + 6;
    }
  });

  return Math.max(leftY, rightY);
};

const drawFooter = (doc, endY) => {
  const y = Math.min(endY + 10, 774);
  const x = mm(16);
  const signWidth = mm(55);
  const signX = PAGE.right - mm(16) - signWidth;

  doc
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .fillColor(COLORS.soft)
    .text(
      "We trust this offer meets your requirements. For clarifications, please feel free to contact us.\nThank you for considering Infinity Byte Solution.",
      x,
      y,
      {
        width: mm(95),
        lineGap: 2,
      }
    );

  doc
    .moveTo(signX, y + 2)
    .lineTo(signX + signWidth, y + 2)
    .lineWidth(0.75)
    .strokeColor(COLORS.text)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(COLORS.text)
    .text("AUTHORIZED SIGNATORY", signX, y + 8, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });

  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(COLORS.soft)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), signX, y + 19, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });
};

export const generateQuotationPdf = async (quotationInput) => {
  await ensureDirectory();

  const quotation = normalizeQuotation(quotationInput);
  const safeQuotationNo = String(quotation.quotationNo || quotationInput?.id || "quotation").replace(/[^\w-]/g, "-");
  const fileName = `${safeQuotationNo}-${Date.now()}.pdf`;
  const filePath = path.join(quotationPdfDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.white);
  drawTopAccent(doc);
  drawHeader(doc, quotation);
  const afterSubjectY = drawSubjectAttention(doc, quotation, 110);
  drawSectionHeader(doc, "Commercial Offer", afterSubjectY + 4);
  const tableEndY = drawItemsTable(doc, quotation, afterSubjectY + 20);
  const totalsEndY = drawTotals(doc, quotation, tableEndY);
  const termsEndY = drawTerms(doc, totalsEndY + 12);
  drawFooter(doc, termsEndY + 4);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = `/uploads/quotations/${fileName}`;
  return { filePath, fileName, publicUrl };
};

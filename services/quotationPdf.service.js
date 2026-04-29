import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import {
  DEFAULT_QUOTATION_TEMPLATE,
  isValidQuotationTemplate,
  quotationPrintTemplates,
} from "./quotationPrintTemplate.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const quotationPdfDirectory = path.join(projectRoot, "uploads", "quotations");
const quotationPreviewPdfDirectory = path.join(projectRoot, "uploads", "quotation-template-previews");
const DUMMY_IMAGE_PATH = path.join(projectRoot, "uploads", "images", "dummy.jpg");

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

const ensureDirectory = async (directory = quotationPdfDirectory) => {
  await fsPromises.mkdir(directory, { recursive: true });
};

const v = (value, fallback = "-") => {
  if (typeof value === "object" && value !== null) return fallback;
  const s = String(value ?? "").trim();
  return s || fallback;
};

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === "object" && value !== null) continue;
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
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

const formatQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return v(value);
  return Number.isInteger(n) ? String(n) : formatMoney(n);
};

const fetchImageBuffer = (url) =>
  new Promise((resolve) => {
    try {
      const lib = url.startsWith("https") ? https : http;
      lib
        .get(url, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            fetchImageBuffer(res.headers.location).then(resolve);
            return;
          }
          if (res.statusCode !== 200) {
            resolve(null);
            return;
          }
          const chunks = [];
          res.on("data", (chunk) => chunks.push(chunk));
          res.on("end", () => resolve(Buffer.concat(chunks)));
          res.on("error", () => resolve(null));
        })
        .on("error", () => resolve(null));
    } catch {
      resolve(null);
    }
  });

const toPdfImageSource = async (source) => {
  if (!source) return null;
  try {
    const image = sharp(source, { failOn: "none" });
    const metadata = await image.metadata();
    if (metadata.format === "jpeg" || metadata.format === "jpg" || metadata.format === "png") {
      return Buffer.isBuffer(source) ? source : await fsPromises.readFile(source);
    }
    return await image.png().toBuffer();
  } catch {
    if (Buffer.isBuffer(source)) return source;
    return source;
  }
};

const fitImagePath = (value) => {
  const s = String(value || "").trim();
  if (!s) return "";
  return path.join(projectRoot, s.replace(/^\/+/, ""));
};

const resolveImageUrl = (value) => {
  const s = String(value || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (!base) return "";
  try {
    return new URL(s, base).toString();
  } catch {
    return "";
  }
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
    itemName: v(item?.itemName || item?.item_name || item?.item || item?.description),
    description: v(item?.description),
    imageUrl: item?.imageUrl || item?.itemImage || item?.item_image || "",
    imagePath: fitImagePath(item?.imageUrl || item?.itemImage || item?.item_image || ""),
    imagePublicUrl: resolveImageUrl(item?.imageUrl || item?.itemImage || item?.item_image || ""),
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
  const isWithTax = /^with\s*tax$/i.test(
    String(quotation?.taxMode || quotation?.tax_mode || "").replace(/([a-z])([A-Z])/g, "$1 $2").trim()
  );
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
      firstText(
        quotation?.customerName,
        quotation?.customer_name,
        quotation?.customerCompany,
        quotation?.customer?.company,
        quotation?.company
      )
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
    department: v(quotation?.department || quotation?.customerDepartment || quotation?.customer_department),
    taxMode: v(quotation?.taxMode || quotation?.tax_mode),
    printTemplate: isValidQuotationTemplate(quotation?.printTemplate || quotation?.print_template)
      ? quotation?.printTemplate || quotation?.print_template
      : DEFAULT_QUOTATION_TEMPLATE,
    items,
    totalQty: Number(quotation?.summary?.totalQty ?? quotation?.totalQty ?? calculatedQty),
    grandTotal: Number(quotation?.summary?.grandTotal ?? quotation?.grandTotal ?? calculatedGrandTotal),
  };
};

const isWithTaxMode = (quotation) =>
  /^with\s*tax$/i.test(String(quotation?.taxMode || "").replace(/([a-z])([A-Z])/g, "$1 $2").trim());

const mm = (value) => value * 2.83464567;
const pt = (value) => value;

const drawTopAccent = (doc) => {
  return doc;
};

const drawHeader = (doc, quotation) => {
  const contentX = mm(16);
  const topY = mm(7);
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
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(COLORS.text)
    .text(v(quotation.quotationNo), rightBlockX, topY + 8, {
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
      topY + 25,
      {
        width: rightBlockWidth,
        align: "right",
        lineBreak: false,
      }
    );

  doc
    .moveTo(contentX, 82)
    .lineTo(PAGE.right, 82)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();
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
    .moveTo(dividerX, startY - 14)
    .lineTo(dividerX, startY + 50)
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
    .lineTo(PAGE.right, y + 4)
    .lineWidth(0.75)
    .strokeColor(COLORS.border)
    .stroke();
};

const TEMPLATE_ACCENT = {
  executive_letterhead: "#111827",
  technical_bid:        "#4B5563",
  premium_tax:          "#8A7A60",
  modern_clean:         "#6B7280",
  compact_commercial:   "#1F2937",
};

const drawClientSubject = (doc, quotation, startY, options = {}) => {
  const x = options.x ?? mm(16);
  const fullWidth = options.width ?? PAGE.width - mm(32);
  const template = quotation.printTemplate || 'executive_letterhead';
  const accentColor = TEMPLATE_ACCENT[template] || TEMPLATE_ACCENT.executive_letterhead;
  const y = startY;

  doc.rect(x, y, fullWidth, 52).fill('#FFFFFF');
  doc.rect(x, y, 3, 52).fill(accentColor);
  doc.moveTo(x, y + 52).lineTo(x + fullWidth, y + 52).lineWidth(0.6).strokeColor('#D1D5DB').stroke();

  const innerX = x + 13;
  const innerW = fullWidth - 18;

  const custName = quotation.customerName !== '-' ? quotation.customerName : '-';
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A')
    .text(custName, innerX, y + 9, { width: innerW });

  const _desig = quotation.designation !== '-' ? ' - ' + quotation.designation : '';
  const attentionText = quotation.person !== '-' ? 'Attn: ' + quotation.person + _desig : 'Attn: -';
  doc.font('Helvetica').fontSize(7.8).fillColor('#64748B')
    .text(attentionText, innerX, y + 24, { width: innerW });

  doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B')
    .text('Subject:  Quotation for ' + v(quotation.serviceName), innerX, y + 37, { width: innerW });

  return y + 52 + (options.bottomGap ?? 12);
};

const getCompactLevel = (itemCount) => {
  if (itemCount > 28) return 2;
  if (itemCount > 14) return 1;
  return 0;
};

const getDocSpacing = (itemCount) => {
  const compactLevel = getCompactLevel(itemCount);
  if (compactLevel === 2) {
    return {
      subjectBottomGap: 6,
      tableGap: 3,
      totalsGap: 1,
      termsGap: 3,
      termsOffset: 10,
      footerOffset: 2,
      footerFontSize: 6.3,
      footerLineGap: 1,
      signGap: 6,
      signCompanyGap: 15,
    };
  }
  if (compactLevel === 1) {
    return {
      subjectBottomGap: 8,
      tableGap: 5,
      totalsGap: 2,
      termsGap: 5,
      termsOffset: 11,
      footerOffset: 4,
      footerFontSize: 6.8,
      footerLineGap: 1.4,
      signGap: 7,
      signCompanyGap: 17,
    };
  }
  return {
    subjectBottomGap: 12,
    tableGap: 6,
    totalsGap: 2,
    termsGap: 8,
    termsOffset: 12,
    footerOffset: 6,
    footerFontSize: 7.5,
    footerLineGap: 2,
    signGap: 8,
    signCompanyGap: 19,
  };
};

const COMPACT_PARAMS = [
  // level 0: normal (â‰¤14 items)
  { paddingX: 3, paddingY: 1.4, imageSize: 14, imageGap: 2, nameFontSize: 6.5, descFontSize: 5.5, minRowHeight: 16, showDesc: true },
  // level 1: compact (15-28 items)
  { paddingX: 2.5, paddingY: 1.2, imageSize: 10, imageGap: 2, nameFontSize: 6.0, descFontSize: 5.0, minRowHeight: 12, showDesc: true },
  // level 2: ultra (>28 items) â€” fits 40+ items on one page
  { paddingX: 2, paddingY: 1.0, imageSize: 0, imageGap: 0, nameFontSize: 5.5, descFontSize: 4.6, minRowHeight: 9, showDesc: true },
];

const TABLE_STYLES = {
  default: {
    headerFill: "#111827",
    headerStroke: "#111827",
    headerText: "#ffffff",
    headerDivider: "#374151",
    bodyStroke: "#d1d5db",
    altRowFill: "#f9fafb",
    bottomHeaderLine: "#111827",
    bottomHeaderLineWidth: 1.15,
  },
  technical_bid: {
    headerFill: "#4b5563",
    headerStroke: "#4b5563",
    headerText: "#ffffff",
    headerDivider: "#6b7280",
    bodyStroke: "#d1d5db",
    altRowFill: "#f3f4f6",
    bottomHeaderLine: "#374151",
    bottomHeaderLineWidth: 1.15,
  },
  modern_clean: {
    headerFill: "#6b7280",
    headerStroke: "#6b7280",
    headerText: "#ffffff",
    headerDivider: "#9ca3af",
    bodyStroke: "#d1d5db",
    altRowFill: "#f9fafb",
    bottomHeaderLine: "#6b7280",
    bottomHeaderLineWidth: 1.15,
  },
  premium_tax: {
    headerFill: "#8a7a60",
    headerStroke: "#8a7a60",
    headerText: "#ffffff",
    headerDivider: "#b6aa92",
    bodyStroke: "#d7cfbf",
    altRowFill: "#faf8f4",
    bottomHeaderLine: "#8a7a60",
    bottomHeaderLineWidth: 1.15,
  },
  compact_commercial: {
    headerFill: "#1f2937",
    headerStroke: "#1f2937",
    headerText: "#f9fafb",
    headerDivider: "#4b5563",
    bodyStroke: "#d1d5db",
    altRowFill: "#f9fafb",
    bottomHeaderLine: "#1f2937",
    bottomHeaderLineWidth: 1.15,
  },
};

const getBodyLayout = (template = "default") => {
  const layouts = {
    default: { x: mm(16), width: PAGE.width - mm(32), tableGap: 6, termsGap: 8 },
    technical_bid: { x: mm(16), width: PAGE.width - mm(32), tableGap: 8, termsGap: 10 },
    modern_clean: { x: mm(16), width: PAGE.width - mm(32), tableGap: 10, termsGap: 12 },
    premium_tax: { x: mm(16), width: PAGE.width - mm(32), tableGap: 12, termsGap: 12 },
    compact_commercial: { x: mm(16), width: PAGE.width - mm(32), tableGap: 4, termsGap: 6 },
  };
  return layouts[template] || layouts.default;
};

const drawItemDescriptionCell = (doc, item, x, y, width, compactLevel = 0) => {
  const cp = COMPACT_PARAMS[compactLevel];
  const { paddingX, paddingY, imageSize, imageGap, nameFontSize, descFontSize } = cp;
  const hasImage = Boolean(item.imageSource) && imageSize > 0;

  let textX = x + paddingX;
  let textWidth = width - paddingX * 2;

  if (hasImage) {
    try {
      doc.image(item.imageSource, x + paddingX, y + paddingY, {
        fit: [imageSize, imageSize],
        align: "left",
        valign: "top",
      });
      textX += imageSize + imageGap;
      textWidth -= imageSize + imageGap;
    } catch {}
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(nameFontSize)
    .fillColor(COLORS.text)
    .text(v(item.itemName), textX, y + paddingY, { width: textWidth, lineGap: -1 });

  if (cp.showDesc && v(item.description) !== "-") {
    const nameHeight = doc.heightOfString(v(item.itemName), { width: textWidth, lineGap: -1 });
    doc
      .font("Helvetica")
      .fontSize(descFontSize)
      .fillColor("#666666")
      .text(v(item.description), textX, y + paddingY + nameHeight, { width: textWidth, lineGap: -1 });
  }
};

const getItemDescriptionHeight = (doc, item, width, compactLevel = 0) => {
  const cp = COMPACT_PARAMS[compactLevel];
  const { paddingX, imageSize, imageGap, nameFontSize, descFontSize, minRowHeight } = cp;
  const hasImage = Boolean(item.imageSource) && imageSize > 0;
  const textWidth = width - paddingX * 2 - (hasImage ? imageSize + imageGap : 0);

  doc.font("Helvetica-Bold").fontSize(nameFontSize);
  const nameHeight = doc.heightOfString(v(item.itemName), { width: textWidth, lineGap: -1 });

  let descriptionHeight = 0;
  if (cp.showDesc && v(item.description) !== "-") {
    doc.font("Helvetica").fontSize(descFontSize);
    descriptionHeight = doc.heightOfString(v(item.description), { width: textWidth, lineGap: -1 });
  }

  const textHeight = nameHeight + descriptionHeight;
  return Math.max(minRowHeight, textHeight + cp.paddingY * 2, hasImage ? imageSize + cp.paddingY * 2 : 0);
};

const drawItemsTable = (doc, quotation, y) => {
  const isWithTax = isWithTaxMode(quotation);
  const template = quotation.printTemplate || "default";
  const style = TABLE_STYLES[template] || TABLE_STYLES.default;
  const layout = getBodyLayout(template);
  const items = quotation.items || [];
  const compactLevel = getCompactLevel(items.length);
  const x = layout.x;
  const tableWidth = layout.width;
  const headerHeight = compactLevel === 2 ? 13 : compactLevel === 1 ? 16 : 22;

  const columns = isWithTax
    ? [
        { key: "sr", label: "Sr", width: 22, align: "center" },
        { key: "description", label: "Item", width: 166, align: "left" },
        { key: "rate", label: "Rate", width: 62, align: "right" },
        { key: "qty", label: "Qty", width: 35, align: "right" },
        { key: "amount", label: "Total", width: 68, align: "right" },
        { key: "rateWithGst", label: "18% GST Rate", width: 74, align: "right" },
        { key: "totalWithGst", label: "Total Amount\nWith GST", width: 0, align: "right" },
      ]
    : [
        { key: "sr", label: "Sr", width: 22, align: "center" },
        { key: "description", label: "Item", width: 272, align: "left" },
        { key: "rate", label: "Rate", width: 78, align: "right" },
        { key: "qty", label: "Qty", width: 42, align: "right" },
        { key: "amount", label: "Total", width: 0, align: "right" },
      ];

  const fixedWidth = columns.slice(0, -1).reduce((sum, col) => sum + col.width, 0);
  columns[columns.length - 1].width = tableWidth - fixedWidth;

  doc.rect(x, y, tableWidth, headerHeight).fill(style.headerFill);
  doc.rect(x, y, tableWidth, headerHeight).lineWidth(0.75).strokeColor(style.headerStroke).stroke();

  let currentX = x;
  columns.forEach((col, index) => {
    if (index > 0) {
      doc
        .moveTo(currentX, y)
        .lineTo(currentX, y + headerHeight)
        .lineWidth(0.75)
        .strokeColor(style.headerDivider)
        .stroke();
    }

    const headerFontSize = compactLevel === 2 ? 4.2 : compactLevel === 1 ? 5.6 : 6.5;
    // vertically center text in header row
    const headerTopPad = compactLevel === 2 ? 3 : compactLevel === 1 ? 5 : 8;

    doc
      .font("Helvetica-Bold")
      .fontSize(headerFontSize)
      .fillColor(style.headerText)
      .text(col.label.toUpperCase(), currentX + 4, headerTopPad + y, {
        width: col.width - 10,
        align: col.align,
        characterSpacing: 0.5,
      });

    currentX += col.width;
  });

  doc
    .moveTo(x, y + headerHeight)
    .lineTo(x + tableWidth, y + headerHeight)
    .lineWidth(style.bottomHeaderLineWidth)
    .strokeColor(style.bottomHeaderLine)
    .stroke();

  // 1pt gap to prevent border collision with first row
  let rowY = y + headerHeight + 1;

  if (!items.length) {
    doc.rect(x, rowY, tableWidth, 22).lineWidth(0.5).strokeColor(style.bodyStroke).stroke();
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor("#999999")
      .text("No line items found.", x, rowY + 7, { width: tableWidth, align: "center" });
    return rowY + 22;
  }

  const descColIndex = columns.findIndex((col) => col.key === "description");
  const descCol = columns[descColIndex];

  items.forEach((item, index) => {
    const rowHeight = getItemDescriptionHeight(doc, item, descCol.width, compactLevel);

    if (index % 2 === 1) {
      doc.rect(x, rowY, tableWidth, rowHeight).fill(style.altRowFill);
    }
    doc.rect(x, rowY, tableWidth, rowHeight).lineWidth(0.5).strokeColor(style.bodyStroke).stroke();

    currentX = x;
    columns.forEach((col, colIndex) => {
      if (colIndex > 0) {
        doc
          .moveTo(currentX, rowY)
          .lineTo(currentX, rowY + rowHeight)
          .lineWidth(0.75)
          .strokeColor(style.bodyStroke)
          .stroke();
      }

      if (col.key === "description") {
        drawItemDescriptionCell(doc, item, currentX, rowY, col.width, compactLevel);
      } else {
        let value = "";
        if (col.key === "sr") value = String(index + 1);
        if (col.key === "rate") value = formatMoney(item.rate);
        if (col.key === "qty") value = formatQty(item.qty);
        if (col.key === "gstAmount") value = formatMoney(item.gstAmount);
        if (col.key === "rateWithGst") value = formatMoney(item.rateWithGst);
        if (col.key === "totalWithGst") value = formatMoney(item.totalWithGst);
        if (col.key === "amount") value = formatMoney(item.amount);

        const isNum = col.key !== "sr";
        const fontSize = col.key === "sr"
          ? (compactLevel === 2 ? 4.5 : compactLevel === 1 ? 5.5 : 6.4)
          : (compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0);

        doc
          .font(isNum ? "Courier" : "Helvetica")
          .fontSize(fontSize)
          .fillColor(col.key === "sr" ? "#999999" : COLORS.text)
          .text(value, currentX + 4, rowY + Math.max(2, (rowHeight - fontSize) / 2), {
            width: col.width - 10,
            align: col.align,
            lineBreak: false,
            ellipsis: true,
          });
      }

      currentX += col.width;
    });

    rowY += rowHeight;
  });

  return rowY;
};

const drawTotals = (doc, quotation, startY) => {
  const isWithTax = isWithTaxMode(quotation);
  const template = quotation.printTemplate || "default";
  const style = TABLE_STYLES[template] || TABLE_STYLES.default;
  const layout = getBodyLayout(template);
  const spacing = getDocSpacing(quotation.items?.length || 0);
  const boxWidth = mm(72);
  const tableRightX = layout.x + layout.width;
  const boxX = tableRightX - boxWidth;
  const rowHeight = 14;
  let y = startY + spacing.totalsGap;

  const rows = [];
  if (isWithTax) {
    rows.push([
      "Sub-Total (PKR)",
      formatMoney(quotation.items.reduce((s, i) => s + Number(i.amount || 0), 0)),
      false,
    ]);
    rows.push([
      "GST Amount (PKR)",
      formatMoney(quotation.items.reduce((s, i) => s + (Number(i.totalWithGst || 0) - Number(i.amount || 0)), 0)),
      false,
    ]);
  }
  rows.push(["Grand Total (PKR)", formatMoney(quotation.grandTotal), true]);

  const totalHeight = rows.reduce((sum, row) => sum + (row[2] ? 17 : rowHeight), 0);
  doc.rect(boxX, y, boxWidth, totalHeight).lineWidth(0.75).strokeColor(style.headerStroke).stroke();

  rows.forEach(([label, value, grand], index) => {
    const h = grand ? 17 : rowHeight;
    if (grand) {
      doc.rect(boxX, y, boxWidth, h).fill(style.headerFill);
      doc
        .moveTo(boxX, y)
        .lineTo(boxX + boxWidth, y)
        .lineWidth(style.bottomHeaderLineWidth)
        .strokeColor(style.bottomHeaderLine)
        .stroke();
    } else if (index > 0) {
      doc
        .moveTo(boxX, y)
        .lineTo(boxX + boxWidth, y)
        .lineWidth(0.5)
        .strokeColor(COLORS.lightBorder)
        .stroke();
    }

    // Vertically center text within row box
    const labelFontSize = grand ? 6.6 : 7.0;
    const valueFontSize = grand ? 7.4 : 8.5;
    const topPad = (h - valueFontSize) / 2;
    doc
      .font(grand ? "Helvetica-Bold" : "Helvetica")
      .fontSize(labelFontSize)
      .fillColor(grand ? style.headerText : COLORS.soft)
      .text(String(label).toUpperCase(), boxX + 5, y + topPad, {
        width: (boxWidth / 2) - 8,
        characterSpacing: grand ? 0.6 : 0.3,
      });

    doc
      .font(grand ? "Courier-Bold" : "Courier")
      .fontSize(valueFontSize)
      .fillColor(grand ? style.headerText : COLORS.text)
      .text(value, boxX + 5, y + topPad, {
        width: boxWidth - 10,
        align: "right",
      });

    y += h;
  });

  return y + spacing.totalsGap;
};

const drawTerms = (doc, startY, itemCount = 0) => {
  const spacing = getDocSpacing(itemCount);
  drawSectionHeader(doc, "Terms & Conditions", startY);

  const x = mm(16);
  const width = PAGE.width - mm(32);
  let y = startY + spacing.termsOffset;
  // HTML: gap=3pt from bullet left edge, text starts after bullet (3.5pt circle + 3pt gap)
  const bulletLeft = x + 3;
  const bulletSize = 3.5; // diameter matching HTML 3.5pt
  const bulletRadius = bulletSize / 2;
  const textX = bulletLeft + bulletSize + 3; // 3pt gap between bullet and text
  const textWidth = width - (textX - x);
  const fontSize = getCompactLevel(itemCount) === 2 ? 5.7 : getCompactLevel(itemCount) === 1 ? 6.1 : 6.5;
  const lineGap = getCompactLevel(itemCount) === 2 ? 0 : 0.2;

  TERMS.forEach((term) => {
    doc
      .circle(bulletLeft + bulletRadius, y + 2 + bulletRadius, bulletRadius)
      .lineWidth(1.5)
      .strokeColor(COLORS.text)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor("#444444")
      .text(term, textX, y, {
        width: textWidth,
        lineGap,
      });

    const textHeight = doc.heightOfString(term, { width: textWidth, lineGap });

    y += textHeight + (getCompactLevel(itemCount) === 2 ? 0.1 : 0.4);
  });

  return y;
};

const drawFooter = (doc, endY, itemCount = 0) => {
  const spacing = getDocSpacing(itemCount);
  const y = Math.min(endY + spacing.footerOffset, 774);
  const x = mm(16);
  const signWidth = mm(55);
  const signX = PAGE.right - signWidth;

  doc
    .font("Helvetica-Oblique")
    .fontSize(spacing.footerFontSize)
    .fillColor(COLORS.soft)
    .text(
      "We trust this offer meets your requirements. For clarifications, please feel free to contact us.\nThank you for considering Infinity Byte Solution.",
      x,
      y,
      {
        width: mm(95),
        lineGap: spacing.footerLineGap,
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
    .text("AUTHORIZED SIGNATORY", signX, y + spacing.signGap, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });

  doc
    .font("Helvetica")
    .fontSize(6.5)
    .fillColor(COLORS.soft)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), signX, y + spacing.signCompanyGap, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });
};

const drawModernHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 26;
  const width = PAGE.width - mm(32);

  doc.rect(x, y, width, 70).fill("#f9fafb");
  doc.rect(x, y, width, 70).lineWidth(0.9).strokeColor("#d1d5db").stroke();
  doc.rect(x, y, 4, 70).fill("#6b7280");
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.text)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 18, y + 15, { width: 270 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#6b7280")
    .text(STATIC_COMPANY_PROFILE.address, x + 18, y + 35, { width: 260 });
  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(COLORS.text)
    .text(v(quotation.quotationNo), x + width - 160, y + 18, {
      width: 140,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6b7280")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 160, y + 36, {
      width: 140,
      align: "right",
    });

  return drawClientSubject(doc, quotation, 108, { x: mm(16), width: PAGE.width - mm(32), bottomGap: 16 });
};

const drawTechnicalHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 24;
  const width = PAGE.width - mm(32);
  const rail = "#1f2937";
  const line = "#4b5563";
  const slate = "#475467";

  doc.rect(x, y, width, 72).lineWidth(0.9).strokeColor("#cfd4dc").stroke();
  doc.rect(x, y, 132, 72).fill(rail);
  doc
    .font("Courier-Bold")
    .fontSize(12.5)
    .fillColor(COLORS.white)
    .text(v(quotation.quotationNo), x + 14, y + 22, { width: 104 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#d1d5db")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + 14, y + 46, {
      width: 104,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .fillColor(COLORS.text)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 154, y + 14, { width: 290 });
  doc
    .font("Helvetica")
    .fontSize(7.8)
    .fillColor(slate)
    .text(STATIC_COMPANY_PROFILE.address, x + 154, y + 34, {
      width: 265,
      lineGap: 2,
    });
  return drawClientSubject(doc, quotation, 116, { x: mm(16), width: PAGE.width - mm(32), bottomGap: 14 });
};

const drawPremiumHeader = (doc, quotation) => {
  const x = mm(16);
  const topY = 28;
  const rightBlockX = 392;

  doc.moveTo(x, 82).lineTo(PAGE.right, 82).lineWidth(0.8).strokeColor("#b6aa92").stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#3f3a33")
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x, topY, { width: 280 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(STATIC_COMPANY_PROFILE.address, x, topY + 22, { width: 260 });
  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor("#3f3a33")
    .text(v(quotation.quotationNo), rightBlockX, topY + 8, {
      width: 158,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), rightBlockX, topY + 25, {
      width: 158,
      align: "right",
    });

  return drawClientSubject(doc, quotation, 98, { x: mm(16), width: PAGE.width - mm(32), bottomGap: 16 });
};

const drawCompactHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 24;
  const width = PAGE.width - mm(32);

  doc.rect(x, y, width, 42).fill("#1f2937");
  doc.moveTo(x, y + 42).lineTo(x + width, y + 42).lineWidth(0.8).strokeColor("#1f2937").stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(COLORS.white)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 16, y + 10, { width: 260 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#d1d5db")
    .text(STATIC_COMPANY_PROFILE.address, x + 16, y + 26, { width: 260 });
  doc
    .font("Courier-Bold")
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(v(quotation.quotationNo), x + width - 150, y + 12, { width: 130, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#d1d5db")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 150, y + 24, {
      width: 130,
      align: "right",
    });

  return drawClientSubject(doc, quotation, 78, {
    x: mm(16),
    width: PAGE.width - mm(32),
    customerFontSize: 8.5,
    detailFontSize: 7.5,
    subjectFontSize: 8,
    departmentGap: 13,
    attentionGap: 15,
    bottomGap: 12,
  });
};

const drawTemplateIntro = (doc, quotation) => {
  if (quotation.printTemplate === "modern_clean") return drawModernHeader(doc, quotation);
  if (quotation.printTemplate === "technical_bid") return drawTechnicalHeader(doc, quotation);
  if (quotation.printTemplate === "premium_tax") return drawPremiumHeader(doc, quotation);
  if (quotation.printTemplate === "compact_commercial") return drawCompactHeader(doc, quotation);

  drawTopAccent(doc);
  drawHeader(doc, quotation);
  return drawClientSubject(doc, quotation, 102, { x: mm(16), width: PAGE.width - mm(32), bottomGap: 16 });
};

const previewQuotation = {
  quotationNo: "AIT/QUT/0003",
  quotationDate: "2026-04-28",
  customerName: "PEEF",
  person: "Akram",
  designation: "Manager",
  department: "IT",
  serviceName: "cctv",
  taxMode: "withTax",
  summary: {
    totalQty: 7,
    grandTotal: 313455.2,
  },
  items: [
    {
      itemName: "HiKvision 8MP IP Camera DS-260345-NV-I",
      description:
        "IP Camera HiKvision 4 MP with 30M IR and 20X Zooming Capacity having AI Features of Motion and Day/Night Color Vision",
      rate: 37500,
      qty: 5,
      total: 187500,
      gstPercent: 18,
      gstAmount: 6750,
      rateWithGst: 44250,
      totalWithGst: 221250,
    },
    {
      itemName: "HiKvision 8 Channel NVR",
      description: "NVR recording unit with 1HD and AI and motions detection support.",
      rate: 37500,
      qty: 1,
      total: 37500,
      gstPercent: 18,
      gstAmount: 6750,
      rateWithGst: 44250,
      totalWithGst: 44250,
    },
    {
      itemName: "DLink Cat6 Cable Copper",
      description: "DLink network cable twisted pair Cat6 shielded 24W, 300 meter.",
      rate: 40640,
      qty: 1,
      total: 40640,
      gstPercent: 18,
      gstAmount: 7315.2,
      rateWithGst: 47955.2,
      totalWithGst: 47955.2,
    },
  ],
};

export const generateQuotationPdf = async (quotationInput, options = {}) => {
  const outputDirectory = options.outputDirectory || quotationPdfDirectory;
  await ensureDirectory(outputDirectory);

  const quotation = normalizeQuotation(quotationInput);

  await Promise.all(
    quotation.items.map(async (item) => {
      if (item.imagePath && fs.existsSync(item.imagePath)) {
        item.imageSource = await toPdfImageSource(item.imagePath);
        return;
      }
      if (item.imagePublicUrl) {
        item.imageSource = await toPdfImageSource(await fetchImageBuffer(item.imagePublicUrl));
        if (!item.imageSource && fs.existsSync(DUMMY_IMAGE_PATH)) {
          item.imageSource = await toPdfImageSource(DUMMY_IMAGE_PATH);
        }
        return;
      }
      item.imageSource = fs.existsSync(DUMMY_IMAGE_PATH)
        ? await toPdfImageSource(DUMMY_IMAGE_PATH)
        : null;
    })
  );

  const safeQuotationNo = String(quotation.quotationNo || quotationInput?.id || "quotation").replace(/[^\w-]/g, "-");
  const fileName = options.fileName || `${safeQuotationNo}-${Date.now()}.pdf`;
  const filePath = path.join(outputDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.white);
  const afterSubjectY = drawTemplateIntro(doc, quotation);
  const layout = getBodyLayout(quotation.printTemplate);
  const spacing = getDocSpacing(quotation.items?.length || 0);
  const tableEndY = drawItemsTable(doc, quotation, afterSubjectY + Math.min(layout.tableGap, spacing.tableGap));
  const totalsEndY = drawTotals(doc, quotation, tableEndY);
  const termsEndY = drawTerms(doc, totalsEndY + Math.min(layout.termsGap, spacing.termsGap), quotation.items?.length || 0);
  drawFooter(doc, termsEndY, quotation.items?.length || 0);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = options.publicUrl || `/uploads/quotations/${fileName}`;
  return { filePath, fileName, publicUrl };
};

export const ensureQuotationTemplatePreviewPdfs = async () => {
  await ensureDirectory(quotationPreviewPdfDirectory);

  const previews = await Promise.all(
    quotationPrintTemplates.map(async (template) => {
      const fileName = `${template.id}.pdf`;
      const filePath = path.join(quotationPreviewPdfDirectory, fileName);
      const publicUrl = `/uploads/quotation-template-previews/${fileName}`;

      try {
        await generateQuotationPdf(
          {
            ...previewQuotation,
            printTemplate: template.id,
          },
          {
            outputDirectory: quotationPreviewPdfDirectory,
            fileName,
            publicUrl,
          }
        );
      } catch (error) {
        console.error(`Failed to generate preview PDF for template "${template.id}":`, error);
        return { id: template.id, previewPdfUrl: null };
      }

      return {
        id: template.id,
        previewPdfUrl: fs.existsSync(filePath) ? publicUrl : null,
      };
    })
  );

  return previews.reduce((acc, preview) => {
    acc[preview.id] = preview.previewPdfUrl;
    return acc;
  }, {});
};

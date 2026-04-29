import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import {
  DEFAULT_ESTIMATION_TEMPLATE,
  estimationPrintTemplates,
  isValidEstimationTemplate,
} from "./estimationPrintTemplate.service.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const estimationPdfDirectory = path.join(projectRoot, "uploads", "estimations");
const estimationPreviewPdfDirectory = path.join(projectRoot, "uploads", "estimation-template-previews");
const DUMMY_IMAGE_PATH = path.join(projectRoot, "uploads", "images", "dummy.jpg");

const PAGE = {
  width: 595.28,
  height: 841.89,
  left: 45.35,
  right: 549.93,
};

const COLORS = {
  text: "#1a1a1a",
  muted: "#555555",
  soft: "#888888",
  softest: "#aaaaaa",
  border: "#cccccc",
  lightBorder: "#e8e8e8",
  tableHeader: "#f2f2f2",
  altRow: "#fafafa",
  white: "#ffffff",
};

const STATIC_COMPANY_PROFILE = {
  name: "Infinity Byte Solution",
  address: "Abid Majeed Road, Lahore Cantt, Lahore",
};

const ensureDirectory = async (dir) => {
  await fsPromises.mkdir(dir ?? estimationPdfDirectory, { recursive: true });
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

const mm = (value) => value * 2.83464567;

const resolveImagePath = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  return path.join(projectRoot, s.replace(/^\/+/, ""));
};

const resolveImageUrl = (raw) => {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const base = String(process.env.PUBLIC_BASE_URL || "").trim();
  if (!base) return null;
  try {
    return new URL(s, base).toString();
  } catch {
    return null;
  }
};

const normalizeEstimation = (input) => {
  const isWithTax = /^withtax$/i.test(String(input?.taxMode || input?.tax_mode || "").replace(/\s+/g, ""));

  const items = Array.isArray(input?.items)
    ? input.items.map((item) => {
        const qty = Number(item?.qty ?? 0);
        const salePrice = Number(item?.salePrice ?? item?.sale_price ?? 0);
        const salePriceWithTax = Number(item?.salePriceWithTax ?? item?.sale_price_with_tax ?? 0);
        const saleTotal = Number(item?.saleTotal ?? item?.sale_total ?? salePrice * qty);
        const saleTotalWithTax = Number(item?.saleTotalWithTax ?? item?.sale_total_with_tax ?? salePriceWithTax * qty);
        const discountPercent = Number(item?.discountPercent ?? item?.discount_percent ?? 0);
        const discountAmount = Number(item?.discountAmount ?? item?.discount_amount ?? 0);
        const finalTotal = Number(item?.finalTotal ?? item?.final_total ?? 0);
        const taxAmount = saleTotalWithTax - saleTotal;

        return {
          itemName: v(item?.itemName || item?.item_name),
          description: v(item?.description, ""),
          qty,
          salePrice,
          salePriceWithTax,
          saleTotal,
          saleTotalWithTax,
          taxAmount,
          discountPercent,
          discountAmount,
          finalTotal,
          hasDiscount: discountPercent > 0 || discountAmount > 0,
          itemImageRaw: item?.itemImage ?? item?.item_image ?? null,
          itemImagePath: resolveImagePath(item?.itemImage ?? item?.item_image ?? null),
          itemImageUrl: resolveImageUrl(item?.itemImage ?? item?.item_image ?? null),
        };
      })
    : [];

  const anyDiscount = input?.anyDiscount ?? items.some((item) => item.hasDiscount);

  const derivedSubTotal = isWithTax
    ? items.reduce((sum, item) => sum + item.saleTotalWithTax, 0)
    : items.reduce((sum, item) => sum + item.saleTotal, 0);

  const derivedTaxTotal = isWithTax
    ? items.reduce((sum, item) => sum + (item.saleTotalWithTax - item.saleTotal), 0)
    : 0;

  const derivedDiscountTotal = items.reduce((sum, item) => sum + item.discountAmount, 0);
  const derivedGrandTotal = Number(input?.summary?.finalTotal ?? input?.finalTotal ?? items.reduce((sum, item) => sum + item.finalTotal, 0));

  return {
    estimateId: v(input?.estimateId || input?.estimate_id),
    estimateDate: input?.estimateDate || input?.estimate_date,
    customerName: v(input?.customerCompany || input?.customerName),
    person: v(input?.person),
    designation: v(input?.designation),
    serviceName: v(input?.service || input?.serviceName),
    taxMode: v(input?.taxMode || input?.tax_mode),
    printTemplate: isValidEstimationTemplate(input?.printTemplate || input?.print_template)
      ? input?.printTemplate || input?.print_template
      : DEFAULT_ESTIMATION_TEMPLATE,
    items,
    anyDiscount,
    isWithTax,
    subTotal: Number(input?.summary?.saleTotal ?? derivedSubTotal),
    taxTotal: Number(input?.summary?.taxTotal ?? derivedTaxTotal),
    discountTotal: Number(input?.summary?.discountTotal ?? derivedDiscountTotal),
    grandTotal: derivedGrandTotal,
  };
};

const drawTopAccent = (doc) => {
  return doc;
};

const drawHeader = (doc, estimation) => {
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
    .text(v(estimation.estimateId), rightBlockX, topY + 8, {
      width: rightBlockWidth,
      align: "right",
      lineBreak: false,
    });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      formatDate(estimation.estimateDate, { day: "2-digit", month: "long", year: "numeric" }),
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
    .lineTo(PAGE.right, 82)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();
};

// Template-aware accent colors for the Bill To panel
const TEMPLATE_ACCENT = {
  executive_letterhead: "#111827",
  technical_bid:        "#4B5563",
  premium_tax:          "#8A7A60",
  modern_clean:         "#6B7280",
  compact_commercial:   "#1F2937",
};

const drawClientSubject = (doc, estimation, startY, options = {}) => {
  const x = options.x ?? mm(16);
  const fullWidth = options.width ?? PAGE.width - mm(32);
  const template = estimation.printTemplate || 'executive_letterhead';
  const accentColor = TEMPLATE_ACCENT[template] || TEMPLATE_ACCENT.executive_letterhead;
  const y = startY;

  doc.rect(x, y, fullWidth, 52).fill('#FFFFFF');
  doc.rect(x, y, 3, 52).fill(accentColor);
  doc.moveTo(x, y + 52).lineTo(x + fullWidth, y + 52).lineWidth(0.6).strokeColor('#D1D5DB').stroke();

  const innerX = x + 13;
  const innerW = fullWidth - 18;

  const custName = estimation.customerName !== '-' ? estimation.customerName : '-';
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A')
    .text(custName, innerX, y + 9, { width: innerW });

  const _desig = estimation.designation !== '-' ? ' - ' + estimation.designation : '';
  const attentionText = estimation.person !== '-' ? 'Attn: ' + estimation.person + _desig : 'Attn: -';
  doc.font('Helvetica').fontSize(7.8).fillColor('#64748B')
    .text(attentionText, innerX, y + 24, { width: innerW });

  doc.font('Helvetica').fontSize(8.5).fillColor('#1E293B')
    .text('Subject:  Estimation for ' + v(estimation.serviceName), innerX, y + 37, { width: innerW });

  return y + 52 + (options.bottomGap ?? 12);
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

// compact levels: 0 = normal, 1 = compact (15-28 items), 2 = ultra (>28 items)
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
      footerOffset: 2,
      footerFontSize: 5.4,
      footerLineGap: 0.5,
      signGap: 6,
      signCompanyGap: 15,
    };
  }
  if (compactLevel === 1) {
    return {
      subjectBottomGap: 8,
      tableGap: 5,
      totalsGap: 2,
      footerOffset: 4,
      footerFontSize: 5.8,
      footerLineGap: 0.8,
      signGap: 7,
      signCompanyGap: 17,
    };
  }
  return {
    subjectBottomGap: 12,
    tableGap: 8,
    totalsGap: 4,
    footerOffset: 8,
    footerFontSize: 6,
    footerLineGap: 1,
    signGap: 8,
    signCompanyGap: 19,
  };
};

const COMPACT_PARAMS = [
  // level 0: normal (≤14 items)
  { paddingX: 3, paddingY: 1.4, imageSize: 14, imageGap: 2, nameFontSize: 6.5, descFontSize: 5.5, minRowHeight: 16, showDesc: true },
  // level 1: compact (15-28 items)
  { paddingX: 2.5, paddingY: 1.2, imageSize: 10, imageGap: 2, nameFontSize: 6.0, descFontSize: 5.0, minRowHeight: 12, showDesc: true },
  // level 2: ultra (>28 items) — fits 40+ items on one page
  { paddingX: 2, paddingY: 1.0, imageSize: 0, imageGap: 0, nameFontSize: 5.5, descFontSize: 4.6, minRowHeight: 9, showDesc: true },
];

const drawDescriptionCell = (doc, item, x, y, width, compactLevel = 0) => {
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
    .text(item.itemName, textX, y + paddingY, {
      width: textWidth,
      lineGap: -1,
    });

  if (cp.showDesc && item.description && item.description !== "-") {
    const nameHeight = doc.heightOfString(item.itemName, {
      width: textWidth,
      lineGap: -1,
    });

    doc
      .font("Helvetica")
      .fontSize(descFontSize)
      .fillColor("#666666")
      .text(item.description, textX, y + paddingY + nameHeight, {
        width: textWidth,
        lineGap: -1,
      });
  }
};

const getDescriptionHeight = (doc, item, width, compactLevel = 0) => {
  const cp = COMPACT_PARAMS[compactLevel];
  const { paddingX, imageSize, imageGap, nameFontSize, descFontSize, minRowHeight } = cp;
  const hasImage = Boolean(item.imageSource) && imageSize > 0;
  const textWidth = width - paddingX * 2 - (hasImage ? imageSize + imageGap : 0);

  doc.font("Helvetica-Bold").fontSize(nameFontSize);
  const nameHeight = doc.heightOfString(item.itemName, {
    width: textWidth,
    lineGap: -1,
  });

  let descriptionHeight = 0;
  if (cp.showDesc && item.description && item.description !== "-") {
    doc.font("Helvetica").fontSize(descFontSize);
    descriptionHeight = doc.heightOfString(item.description, {
      width: textWidth,
      lineGap: -1,
    });
  }

  const textHeight = nameHeight + descriptionHeight;
  return Math.max(minRowHeight, textHeight + cp.paddingY * 2, hasImage ? imageSize + cp.paddingY * 2 : 0);
};

// Per-template table color schemes
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

const drawItemsTable = (doc, estimation, y) => {
  const { isWithTax, anyDiscount, items } = estimation;
  const template = estimation.printTemplate || "default";
  const style = TABLE_STYLES[template] || TABLE_STYLES.default;
  const compactLevel = getCompactLevel(items.length);
  const x = mm(16);
  const tableWidth = PAGE.width - mm(32);
  const headerHeight = compactLevel === 2 ? 13 : compactLevel === 1 ? 16 : 22;
  const headerFill = style.headerFill;
  const headerStroke = style.headerStroke;
  const bodyStroke = style.bodyStroke;
  const headerText = style.headerText;

  const columns = isWithTax
    ? [
        { key: "sr", label: "Sr", width: 22, align: "center" },
        { key: "description", label: "Item", width: anyDiscount ? 140 : 166, align: "left" },
        { key: "rate", label: "Rate", width: 55, align: "right" },
        { key: "qty", label: "Qty", width: 32, align: "right" },
        { key: "gstAmount", label: "GST Amt", width: 52, align: "right" },
        { key: "rateWithGst", label: "Rate + GST", width: 68, align: "right" },
        ...(anyDiscount ? [{ key: "discAmt", label: "Disc Amt", width: 55, align: "right" }] : []),
        { key: "totalWithGst", label: "Total Amount\nWith GST", width: 0, align: "right" },
      ]
    : [
        { key: "sr", label: "Sr", width: 22, align: "center" },
        { key: "description", label: "Item", width: anyDiscount ? 210 : 272, align: "left" },
        { key: "rate", label: "Rate", width: 68, align: "right" },
        { key: "qty", label: "Qty", width: 38, align: "right" },
        ...(anyDiscount ? [{ key: "discAmt", label: "Disc Amt", width: 62, align: "right" }] : []),
        { key: "amount", label: "Total", width: 0, align: "right" },
      ];

  const fixedWidth = columns.slice(0, -1).reduce((sum, col) => sum + col.width, 0);
  columns[columns.length - 1].width = tableWidth - fixedWidth;

  doc.rect(x, y, tableWidth, headerHeight).fill(headerFill);
  doc.rect(x, y, tableWidth, headerHeight).lineWidth(template === "technical_bid" ? 0.9 : 0.75).strokeColor(headerStroke).stroke();

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
    const headerTopPad = compactLevel === 2 ? 3 : compactLevel === 1 ? 5 : 8;
    const headerLineGap = compactLevel === 2 ? 4 : compactLevel === 1 ? 6 : 7;
    const lines = String(col.label).split("\n");
    lines.forEach((line, lineIndex) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(headerFontSize)
        .fillColor(headerText)
        .text(line.toUpperCase(), currentX + 4, headerTopPad + y + lineIndex * headerLineGap, {
          width: col.width - 10,
          align: col.align,
          characterSpacing: 0.5,
        });
    });

    currentX += col.width;
  });

  doc
    .moveTo(x, y + headerHeight)
    .lineTo(x + tableWidth, y + headerHeight)
    .lineWidth(style.bottomHeaderLineWidth)
    .strokeColor(style.bottomHeaderLine)
    .stroke();

  // Start rows 1pt below header bottom line to prevent border collision
  let rowY = y + headerHeight + 1;

  if (!items.length) {
    doc.rect(x, rowY, tableWidth, 22).lineWidth(0.5).strokeColor(bodyStroke).stroke();
    doc
      .font("Helvetica")
      .fontSize(6)
      .fillColor("#999999")
      .text("No line items found.", x, rowY + 7, {
        width: tableWidth,
        align: "center",
      });
    return rowY + 22;
  }

  items.forEach((item, index) => {
    const itemColumn = columns.find((col) => col.key === "description");
    const rowHeight = getDescriptionHeight(doc, item, itemColumn.width, compactLevel);

    if (index % 2 === 1) {
      doc.rect(x, rowY, tableWidth, rowHeight).fill(style.altRowFill);
    }

    doc.rect(x, rowY, tableWidth, rowHeight).lineWidth(0.5).strokeColor(bodyStroke).stroke();

    currentX = x;
    columns.forEach((col, colIndex) => {
      if (colIndex > 0) {
        doc
          .moveTo(currentX, rowY)
          .lineTo(currentX, rowY + rowHeight)
          .lineWidth(0.75)
          .strokeColor(bodyStroke)
          .stroke();
      }

      if (col.key === "description") {
        drawDescriptionCell(doc, item, currentX, rowY, col.width, compactLevel);
      } else {
        let value = "";
        let font = "Courier";
        let fontSize = 6.3;
        let color = COLORS.text;

        switch (col.key) {
          case "sr":
            value = String(index + 1);
            font = "Helvetica";
            fontSize = compactLevel === 2 ? 4.5 : compactLevel === 1 ? 5.5 : 6.4;
            color = "#999999";
            break;
          case "rate":
            value = formatMoney(item.salePrice);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "qty":
            value = formatMoney(item.qty);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "gstAmount":
            value = formatMoney(item.taxAmount);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "rateWithGst":
            value = formatMoney(item.salePriceWithTax);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "discAmt":
            value = formatMoney(item.discountAmount);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "totalWithGst":
            value = formatMoney(item.finalTotal);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
          case "amount":
            value = formatMoney(item.saleTotal);
            fontSize = compactLevel === 2 ? 4.8 : compactLevel === 1 ? 5.8 : 7.0;
            break;
        }

        doc
          .font(font)
          .fontSize(fontSize)
          .fillColor(color)
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

const drawTotals = (doc, estimation, startY) => {
  const { isWithTax, anyDiscount, grandTotal, items } = estimation;
  const template = estimation.printTemplate || "default";
  const style = TABLE_STYLES[template] || TABLE_STYLES.default;
  const spacing = getDocSpacing(items.length);
  const boxWidth = mm(72);
  const tableRightX = mm(16) + (PAGE.width - mm(32));
  const boxX = tableRightX - boxWidth;
  const rowHeight = 14;
  let y = startY + spacing.totalsGap;

  const subTotal = items.reduce((s, i) => s + Number(i.saleTotal || 0), 0);
  const subTotalWithTax = items.reduce((s, i) => s + Number(i.saleTotalWithTax || 0), 0);
  const discountTotal = items.reduce((s, i) => s + Number(i.discountAmount || 0), 0);
  const gstTotal = items.reduce((s, i) => s + Number(i.taxAmount || 0), 0);

  const rows = [];
  if (isWithTax) {
    rows.push(["Sub-Total (PKR)", formatMoney(subTotal), false]);
    rows.push(["GST Amount (PKR)", formatMoney(gstTotal), false]);
  } else {
    rows.push(["Sub-Total (PKR)", formatMoney(subTotal), false]);
  }
  if (anyDiscount && discountTotal > 0) {
    rows.push(["Discount (PKR)", `- ${formatMoney(discountTotal)}`, false, true]);
  }
  rows.push(["Grand Total (PKR)", formatMoney(grandTotal), true]);

  const totalHeight = rows.reduce((sum, row) => sum + (row[2] ? 17 : rowHeight), 0);
  doc.rect(boxX, y, boxWidth, totalHeight).lineWidth(0.75).strokeColor(style.headerStroke).stroke();

  rows.forEach(([label, value, grand, isDiscount], index) => {
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
      .fillColor(isDiscount ? "#c0392b" : grand ? style.headerText : COLORS.text)
      .text(value, boxX + 5, y + topPad, {
        width: boxWidth - 10,
        align: "right",
      });

    y += h;
  });

  return y + spacing.totalsGap;
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
      "This estimation is prepared for review purposes only and is subject to change.\nThank you for considering Infinity Byte Solution.",
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
    .fontSize(6.5)
    .fillColor(COLORS.text)
    .text("AUTHORIZED SIGNATORY", signX, y + spacing.signGap, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });

  doc
    .font("Helvetica")
    .fontSize(5.8)
    .fillColor(COLORS.soft)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), signX, y + spacing.signCompanyGap, {
      width: signWidth,
      align: "center",
      characterSpacing: 0.8,
    });
};

const drawTechnicalHeader = (doc, estimation) => {
  const x = mm(16);
  const y = 24;
  const width = PAGE.width - mm(32);
  const rail = "#1f2937";
  const line = "#4b5563";
  const slate = "#4b5563";

  doc.rect(x, y, width, 72).lineWidth(0.9).strokeColor("#cfd4dc").stroke();
  doc.rect(x, y, 132, 72).fill(rail);
  doc
    .font("Courier-Bold")
    .fontSize(12.5)
    .fillColor(COLORS.white)
    .text(v(estimation.estimateId), x + 14, y + 22, { width: 104 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#d1d5db")
    .text(formatDate(estimation.estimateDate, { day: "2-digit", month: "long", year: "numeric" }), x + 14, y + 46, {
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
  doc
    .font("Helvetica")
    .fontSize(6.7)
    .fillColor("#667085")
    .text("Commercial estimation prepared for technical and management review", x + 154, y + 50, {
      width: 265,
    });

  return drawClientSubject(doc, estimation, 116);
};

const drawModernHeader = (doc, estimation) => {
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
    .text(v(estimation.estimateId), x + width - 160, y + 18, {
      width: 140,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#6b7280")
    .text(formatDate(estimation.estimateDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 160, y + 36, {
      width: 140,
      align: "right",
    });

  return drawClientSubject(doc, estimation, 108);
};

const drawPremiumHeader = (doc, estimation) => {
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
    .text(v(estimation.estimateId), rightBlockX, topY + 8, {
      width: 158,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(formatDate(estimation.estimateDate, { day: "2-digit", month: "long", year: "numeric" }), rightBlockX, topY + 25, {
      width: 158,
      align: "right",
    });

  return drawClientSubject(doc, estimation, 98, { x: mm(16), width: PAGE.width - mm(32), bottomGap: 16 });
};

const drawCompactHeader = (doc, estimation) => {
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
    .text(v(estimation.estimateId), x + width - 150, y + 12, { width: 130, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#d1d5db")
    .text(formatDate(estimation.estimateDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 150, y + 24, {
      width: 130,
      align: "right",
    });

  return drawClientSubject(doc, estimation, 78, {
    x: mm(16),
    width: PAGE.width - mm(32),
    customerFontSize: 8.5,
    detailFontSize: 7.5,
    subjectFontSize: 8,
    attentionGap: 15,
    bottomGap: 12,
  });
};

const drawTemplateIntro = (doc, estimation) => {
  const spacing = getDocSpacing(estimation.items?.length || 0);
  if (estimation.printTemplate === "modern_clean") return drawModernHeader(doc, estimation);
  if (estimation.printTemplate === "technical_bid") return drawTechnicalHeader(doc, estimation);
  if (estimation.printTemplate === "premium_tax") return drawClientSubject ? drawPremiumHeader(doc, estimation) : drawPremiumHeader(doc, estimation);
  if (estimation.printTemplate === "compact_commercial") return drawCompactHeader(doc, estimation);

  drawTopAccent(doc);
  drawHeader(doc, estimation);
  return drawClientSubject(doc, estimation, 102, { x: mm(16), width: PAGE.width - mm(32), bottomGap: spacing.subjectBottomGap });
};

const previewEstimation = {
  estimateId: "EST-0003",
  estimateDate: "2026-04-27",
  customerName: "Infity Bytes",
  person: "Eman",
  designation: "Full stack",
  serviceName: "cctv",
  taxMode: "withTax",
  summary: {
    saleTotal: 583395,
    taxTotal: 105011.1,
    discountTotal: 0,
    finalTotal: 688406.1,
  },
  items: [
    {
      itemName: "Samsung Tv",
      description: "This is samsung tv.",
      qty: 1,
      salePrice: 63000,
      salePriceWithTax: 74340,
      saleTotal: 63000,
      saleTotalWithTax: 74340,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 74340,
    },
    {
      itemName: "HikVision 8 Channel NVR",
      description: "NVR recording unit with AI and motion detection support.",
      qty: 1,
      salePrice: 37500,
      salePriceWithTax: 44250,
      saleTotal: 37500,
      saleTotalWithTax: 44250,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 44250,
    },
    {
      itemName: "DLink 8 Port Manageable Network Switch",
      description: "Manageable switch for IT equipment with 220 watt adapter.",
      qty: 3,
      salePrice: 10965,
      salePriceWithTax: 12938.7,
      saleTotal: 32895,
      saleTotalWithTax: 38816.1,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 38816.1,
    },
    {
      itemName: "HikVision 8MP IP Camera DS-260345-NV-I",
      description:
        "IP Camera HiKvision 4 MP with 30M IR and 20X Zooming Capacity having AI features of motion and day/night color vision.",
      qty: 12,
      salePrice: 37500,
      salePriceWithTax: 44250,
      saleTotal: 450000,
      saleTotalWithTax: 531000,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 531000,
    },
  ],
};

export const generateEstimationPdf = async (estimationInput, options = {}) => {
  const outputDirectory = options.outputDirectory || estimationPdfDirectory;
  await ensureDirectory(outputDirectory);

  const estimation = normalizeEstimation(estimationInput);

  await Promise.all(
    estimation.items.map(async (item) => {
      if (item.itemImagePath && fs.existsSync(item.itemImagePath)) {
        item.imageSource = await toPdfImageSource(item.itemImagePath);
        return;
      }
      if (item.itemImageUrl) {
        item.imageSource = await toPdfImageSource(await fetchImageBuffer(item.itemImageUrl));
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

  const safeId = String(estimation.estimateId || estimationInput?.id || "estimation").replace(/[^\w-]/g, "-");
  const fileName = options.fileName || `${safeId}-${Date.now()}.pdf`;
  const filePath = path.join(outputDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.white);
  const afterSubjectY = drawTemplateIntro(doc, estimation);

  const spacing = getDocSpacing(estimation.items?.length || 0);
  const tableEndY = drawItemsTable(doc, estimation, afterSubjectY + spacing.tableGap);
  const totalsEndY = drawTotals(doc, estimation, tableEndY);
  drawFooter(doc, totalsEndY, estimation.items?.length || 0);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = options.publicUrl || `/uploads/estimations/${fileName}`;
  return { filePath, fileName, publicUrl };
};

// In-memory cache: { [templateId]: publicUrl }
const _previewPdfCache = {};

export const ensureEstimationTemplatePreviewPdfs = async ({ forceRegenerate = false } = {}) => {
  await ensureDirectory(estimationPreviewPdfDirectory);

  const previews = await Promise.all(
    estimationPrintTemplates.map(async (template) => {
      const fileName = `${template.id}.pdf`;
      const filePath = path.join(estimationPreviewPdfDirectory, fileName);
      const publicUrl = `/uploads/estimation-template-previews/${fileName}`;

      // Return cached URL immediately if not forced and file exists on disk
      if (!forceRegenerate && _previewPdfCache[template.id] && fs.existsSync(filePath)) {
        return { id: template.id, previewPdfUrl: _previewPdfCache[template.id] };
      }

      // Also skip regeneration if file already exists on disk (e.g. after server restart)
      if (!forceRegenerate && fs.existsSync(filePath)) {
        _previewPdfCache[template.id] = publicUrl;
        return { id: template.id, previewPdfUrl: publicUrl };
      }

      try {
        await generateEstimationPdf(
          { ...previewEstimation, printTemplate: template.id },
          { outputDirectory: estimationPreviewPdfDirectory, fileName, publicUrl }
        );
        _previewPdfCache[template.id] = publicUrl;
      } catch (error) {
        console.error(`Failed to generate estimation preview PDF for template "${template.id}":`, error);
        return { id: template.id, previewPdfUrl: null };
      }
      return { id: template.id, previewPdfUrl: fs.existsSync(filePath) ? publicUrl : null };
    })
  );

  return previews.reduce((acc, p) => { acc[p.id] = p.previewPdfUrl; return acc; }, {});
};

// Call this after any styling change to force fresh preview PDFs
export const regenerateEstimationTemplatePreviewPdfs = () =>
  ensureEstimationTemplatePreviewPdfs({ forceRegenerate: true });

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
  doc.save();
  doc.rect(0, 0, PAGE.width, pt(3.5)).fill(COLORS.text);
  doc.restore();
};

const drawHeader = (doc, quotation) => {
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

const drawItemDescriptionCell = (doc, item, x, y, width) => {
  const paddingX = 6;
  const paddingY = 7;
  const imageSize = 28;
  const imageGap = 5;
  const hasImage = Boolean(item.imageSource);

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
    .fontSize(8.5)
    .fillColor(COLORS.text)
    .text(v(item.itemName), textX, y + paddingY, {
      width: textWidth,
      lineGap: 0,
    });

  if (v(item.description) !== "-") {
    const nameHeight = doc.heightOfString(v(item.itemName), {
      width: textWidth,
      lineGap: 0,
    });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#666666")
      .text(v(item.description), textX, y + paddingY + nameHeight + 2, {
        width: textWidth,
        lineGap: 0,
      });
  }
};

const getItemDescriptionHeight = (doc, item, width) => {
  const paddingX = 6;
  const imageSize = 28;
  const imageGap = 5;
  const hasImage = Boolean(item.imageSource);
  const textWidth = width - paddingX * 2 - (hasImage ? imageSize + imageGap : 0);

  const nameHeight = doc.heightOfString(v(item.itemName), {
    width: textWidth,
    lineGap: 0,
  });

  const descriptionHeight =
    v(item.description) !== "-"
      ? doc.heightOfString(v(item.description), {
          width: textWidth,
          lineGap: 0,
        })
      : 0;

  const textHeight = nameHeight + (descriptionHeight ? descriptionHeight + 2 : 0);
  return Math.max(26, textHeight + 14, hasImage ? imageSize + 14 : 0);
};

const drawItemsTable = (doc, quotation, y) => {
  const isWithTax = isWithTaxMode(quotation);
  const isTechnical = quotation.printTemplate === "technical_bid";
  const x = mm(16);
  const tableWidth = PAGE.width - mm(32);
  const headerHeight = 24;
  const rowMinHeight = 26;
  const headerFill = isTechnical ? "#f6f8fb" : COLORS.tableHeader;
  const headerStroke = isTechnical ? "#b9c3d1" : COLORS.border;
  const bodyStroke = isTechnical ? "#dfe5ee" : COLORS.lightBorder;
  const headerText = isTechnical ? "#111827" : COLORS.text;

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

  doc.rect(x, y, tableWidth, headerHeight).fill(headerFill);
  doc.rect(x, y, tableWidth, headerHeight).lineWidth(isTechnical ? 0.9 : 0.75).strokeColor(headerStroke).stroke();

  let currentX = x;
  columns.forEach((col, index) => {
    if (index > 0) {
      doc
        .moveTo(currentX, y)
        .lineTo(currentX, y + headerHeight)
        .lineWidth(0.75)
        .strokeColor(isTechnical ? "#d9e1ec" : "#dddddd")
        .stroke();
    }

    doc
      .font("Helvetica-Bold")
      .fontSize(6.8)
      .fillColor(headerText)
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
    .lineWidth(isTechnical ? 1.15 : 1.5)
    .strokeColor(isTechnical ? "#111827" : COLORS.text)
    .stroke();

  let rowY = y + headerHeight;
  const items = quotation.items || [];

  if (!items.length) {
    doc.rect(x, rowY, tableWidth, rowMinHeight).lineWidth(0.5).strokeColor(bodyStroke).stroke();
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
    const rowHeight = Math.max(rowMinHeight, getItemDescriptionHeight(doc, item, columns[1].width));

    if (index % 2 === 1) {
      doc.rect(x, rowY, tableWidth, rowHeight).fill(isTechnical ? "#fbfcfe" : COLORS.altRow);
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
        drawItemDescriptionCell(doc, item, currentX, rowY, col.width);
      } else {
        let value = "";
        if (col.key === "sr") value = String(index + 1);
        if (col.key === "rate") value = formatMoney(item.rate);
        if (col.key === "qty") value = formatMoney(item.qty);
        if (col.key === "gstAmount") value = formatMoney(item.gstAmount);
        if (col.key === "rateWithGst") value = formatMoney(item.rateWithGst);
        if (col.key === "totalWithGst") value = formatMoney(item.totalWithGst);
        if (col.key === "amount") value = formatMoney(item.amount);

        doc
          .font(col.key === "sr" ? "Helvetica" : "Courier")
          .fontSize(col.key === "sr" ? 8 : 8.2)
          .fillColor(col.key === "sr" ? "#999999" : COLORS.text)
          .text(value, currentX + 6, rowY + 7, {
            width: col.width - 12,
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
  const isTechnical = quotation.printTemplate === "technical_bid";
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
  doc.rect(boxX, y, boxWidth, totalHeight).lineWidth(isTechnical ? 0.9 : 0.75).strokeColor(isTechnical ? "#b9c3d1" : COLORS.border).stroke();

  rows.forEach(([label, value, grand], index) => {
    const h = grand ? 24 : rowHeight;
    if (grand) {
      doc.rect(boxX, y, boxWidth, h).fill(isTechnical ? "#111827" : COLORS.tableHeader);
      doc
        .moveTo(boxX, y)
        .lineTo(boxX + boxWidth, y)
        .lineWidth(isTechnical ? 1 : 1.5)
        .strokeColor(isTechnical ? "#111827" : COLORS.text)
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
      .fillColor(grand && isTechnical ? COLORS.white : grand ? COLORS.text : COLORS.soft)
      .text(String(label).toUpperCase(), boxX + 9, y + (grand ? 8 : 6.5), {
        width: 110,
        characterSpacing: grand ? 1 : 0.6,
      });

    doc
      .font(grand ? "Courier-Bold" : "Courier")
      .fontSize(grand ? 10 : 8.5)
      .fillColor(grand && isTechnical ? COLORS.white : COLORS.text)
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

  const x = mm(16);
  const width = PAGE.width - mm(32);
  let y = startY + 16;
  const bulletX = x + 4;
  const textX = x + 16;
  const textWidth = width - (textX - x);
  const fontSize = 7.8;
  const bulletRadius = 2.1;

  TERMS.forEach((term) => {
    doc.circle(bulletX, y + 4.8, bulletRadius).lineWidth(1.4).strokeColor(COLORS.text).stroke();

    doc
      .font("Helvetica")
      .fontSize(fontSize)
      .fillColor("#444444")
      .text(term, textX, y, {
        width: textWidth,
        lineGap: 0,
      });

    const textHeight = doc.heightOfString(term, {
      width: textWidth,
      lineGap: 0,
    });

    y += Math.max(fontSize + 3, textHeight + 2);
  });

  return y;
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

const drawModernHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 26;
  const width = PAGE.width - mm(32);

  doc.roundedRect(x, y, width, 76, 10).fill("#1264a3");
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLORS.white)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 18, y + 17, { width: 270 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#d8ecff")
    .text(STATIC_COMPANY_PROFILE.address, x + 18, y + 43, { width: 260 });
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor("#d8ecff")
    .text("QUOTATION", x + width - 160, y + 15, {
      width: 140,
      align: "right",
      characterSpacing: 2,
    });
  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(COLORS.white)
    .text(v(quotation.quotationNo), x + width - 160, y + 31, {
      width: 140,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor("#d8ecff")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 160, y + 48, {
      width: 140,
      align: "right",
    });

  return drawSubjectAttention(doc, quotation, 122);
};

const drawTechnicalHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 26;
  const width = PAGE.width - mm(32);
  const navy = "#101b2d";
  const blue = "#2457d6";
  const slate = "#475467";

  doc.rect(0, 0, PAGE.width, 4).fill(blue);
  doc.rect(x, y, width, 74).lineWidth(0.9).strokeColor("#c7d0dd").stroke();
  doc.rect(x, y, 150, 74).fill(navy);
  doc
    .font("Helvetica-Bold")
    .fontSize(6.8)
    .fillColor("#9db7ef")
    .text("TECHNICAL BID", x + 16, y + 15, { characterSpacing: 2.2 });
  doc
    .font("Courier-Bold")
    .fontSize(12.5)
    .fillColor(COLORS.white)
    .text(v(quotation.quotationNo), x + 16, y + 33, { width: 120 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#cbd5e1")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + 16, y + 52, {
      width: 120,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(17)
    .fillColor(COLORS.text)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 174, y + 15, { width: 270 });
  doc
    .font("Helvetica")
    .fontSize(7.8)
    .fillColor(slate)
    .text(STATIC_COMPANY_PROFILE.address, x + 174, y + 39, {
      width: 245,
      lineGap: 2,
    });
  doc
    .font("Helvetica")
    .fontSize(6.7)
    .fillColor("#667085")
    .text("Commercial proposal prepared for review and approval", x + 174, y + 54, {
      width: 245,
    });

  return drawSubjectAttention(doc, quotation, 124);
};

const drawPremiumHeader = (doc, quotation) => {
  const x = mm(16);
  const topY = 28;
  const rightBlockX = 392;

  doc.rect(0, 0, PAGE.width, 8).fill("#0f3d2e");
  doc.rect(0, 8, PAGE.width, 3).fill("#c9a24d");
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor("#0f3d2e")
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x, topY, { width: 280 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#9a7a25")
    .text("PREMIUM COMMERCIAL OFFER", x, topY + 21, { characterSpacing: 1.6 });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(STATIC_COMPANY_PROFILE.address, x, topY + 34, { width: 260 });
  doc
    .font("Helvetica-Bold")
    .fontSize(6.5)
    .fillColor("#9a7a25")
    .text("QUOTATION", rightBlockX, topY + 2, {
      width: 158,
      align: "right",
      characterSpacing: 2.2,
    });
  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor("#0f3d2e")
    .text(v(quotation.quotationNo), rightBlockX, topY + 16, {
      width: 158,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), rightBlockX, topY + 33, {
      width: 158,
      align: "right",
    });
  doc.moveTo(x, 86).lineTo(PAGE.right - mm(16), 86).lineWidth(1.2).strokeColor("#c9a24d").stroke();

  return drawSubjectAttention(doc, quotation, 112);
};

const drawCompactHeader = (doc, quotation) => {
  const x = mm(16);
  const y = 24;
  const width = PAGE.width - mm(32);

  doc.rect(x, y, width, 52).fill("#111827");
  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(COLORS.white)
    .text(STATIC_COMPANY_PROFILE.name.toUpperCase(), x + 16, y + 12, { width: 260 });
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor("#cbd5e1")
    .text(STATIC_COMPANY_PROFILE.address, x + 16, y + 34, { width: 260 });
  doc
    .font("Courier-Bold")
    .fontSize(11)
    .fillColor(COLORS.white)
    .text(v(quotation.quotationNo), x + width - 150, y + 12, { width: 130, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(7.5)
    .fillColor("#cbd5e1")
    .text(formatDate(quotation.quotationDate, { day: "2-digit", month: "long", year: "numeric" }), x + width - 150, y + 30, {
      width: 130,
      align: "right",
    });

  return drawSubjectAttention(doc, quotation, 94);
};

const drawTemplateIntro = (doc, quotation) => {
  if (quotation.printTemplate === "modern_clean") return drawModernHeader(doc, quotation);
  if (quotation.printTemplate === "technical_bid") return drawTechnicalHeader(doc, quotation);
  if (quotation.printTemplate === "premium_tax") return drawPremiumHeader(doc, quotation);
  if (quotation.printTemplate === "compact_commercial") return drawCompactHeader(doc, quotation);

  drawTopAccent(doc);
  drawHeader(doc, quotation);
  return drawSubjectAttention(doc, quotation, 110);
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

      const exists = fs.existsSync(filePath);
      if (!exists) {
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

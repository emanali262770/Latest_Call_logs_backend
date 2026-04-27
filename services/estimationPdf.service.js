import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";
import http from "http";
import https from "https";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const estimationPdfDirectory = path.join(projectRoot, "uploads", "estimations");

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

const ensureDirectory = async () => {
  await fsPromises.mkdir(estimationPdfDirectory, { recursive: true });
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
        const taxAmount = salePriceWithTax - salePrice;

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
  doc.save();
  doc.rect(0, 0, PAGE.width, 3.5).fill(COLORS.text);
  doc.restore();
};

const drawHeader = (doc, estimation) => {
  const contentX = mm(16);
  const topY = mm(7) + 3.5;
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
    .text("ESTIMATION", rightBlockX, topY + 2, {
      width: rightBlockWidth,
      align: "right",
      characterSpacing: 2.2,
    });

  doc
    .font("Courier-Bold")
    .fontSize(13)
    .fillColor(COLORS.text)
    .text(v(estimation.estimateId), rightBlockX, topY + 16, {
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
    .lineTo(PAGE.right - mm(16), 82)
    .lineWidth(1)
    .strokeColor(COLORS.border)
    .stroke();
};

const drawSubjectAttention = (doc, estimation, startY) => {
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
    .text(`Estimation for ${v(estimation.serviceName)}`, x, startY + 11, {
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

  if (estimation.customerName !== "-") {
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(COLORS.text)
      .text(estimation.customerName, attnX, startY + 11, { width: blockWidth - 10 });
  }

  if (estimation.person !== "-") {
    const line =
      estimation.designation !== "-"
        ? `${estimation.person} — ${estimation.designation}`
        : estimation.person;

    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(COLORS.muted)
      .text(line, attnX, startY + 24, { width: blockWidth - 10 });
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

const drawDescriptionCell = (doc, item, x, y, width) => {
  const paddingX = 5;
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
    .text(item.itemName, textX, y + paddingY, {
      width: textWidth,
      lineGap: 0,
    });

  if (item.description && item.description !== "-") {
    const nameHeight = doc.heightOfString(item.itemName, {
      width: textWidth,
      lineGap: 0,
    });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#666666")
      .text(item.description, textX, y + paddingY + nameHeight + 2, {
        width: textWidth,
        lineGap: 0,
      });
  }
};

const getDescriptionHeight = (doc, item, width) => {
  const paddingX = 5;
  const imageSize = 28;
  const imageGap = 5;
  const hasImage = Boolean(item.imageSource);
  const textWidth = width - paddingX * 2 - (hasImage ? imageSize + imageGap : 0);

  const nameHeight = doc.heightOfString(item.itemName, {
    width: textWidth,
    lineGap: 0,
  });

  const descriptionHeight =
    item.description && item.description !== "-"
      ? doc.heightOfString(item.description, {
          width: textWidth,
          lineGap: 0,
        })
      : 0;

  const textHeight = nameHeight + (descriptionHeight ? descriptionHeight + 2 : 0);
  return Math.max(36, textHeight + 14, hasImage ? imageSize + 14 : 0);
};

const drawItemsTable = (doc, estimation, y) => {
  const { anyDiscount, isWithTax, items } = estimation;
  const x = mm(16);
  const tableWidth = PAGE.width - mm(32);
  const headerHeight = 28;

  const itemColWidth = anyDiscount ? 160 : 190;

  const columns = [
    { key: "sr", label: "#", width: 22, align: "center" },
    { key: "item", label: "Item /\nDescription", width: itemColWidth, align: "left" },
    { key: "qty", label: "Qty", width: 35, align: "right" },
    { key: "salePrice", label: isWithTax ? "Unit Price (w/ Tax)" : "Unit Price", width: 85, align: "right" },
    ...(isWithTax ? [{ key: "taxAmt", label: "Tax Amt", width: 55, align: "right" }] : []),
    ...(anyDiscount ? [{ key: "discAmt", label: "Disc Amt", width: 60, align: "right" }] : []),
    { key: "total", label: "Final Total", width: 0, align: "right" },
  ];

  const fixedWidth = columns.slice(0, -1).reduce((sum, col) => sum + col.width, 0);
  columns[columns.length - 1].width = tableWidth - fixedWidth;

  doc.rect(x, y, tableWidth, headerHeight).fill(COLORS.tableHeader);
  doc.rect(x, y, tableWidth, headerHeight).lineWidth(0.75).strokeColor(COLORS.border).stroke();

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

    const lines = String(col.label).split("\n");
    lines.forEach((line, lineIndex) => {
      doc
        .font("Helvetica-Bold")
        .fontSize(6.8)
        .fillColor(COLORS.text)
        .text(line.toUpperCase(), currentX + 5, y + 8 + lineIndex * 9, {
          width: col.width - 10,
          align: col.align,
          characterSpacing: 0.8,
        });
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

  if (!items.length) {
    doc.rect(x, rowY, tableWidth, 36).lineWidth(0.5).strokeColor(COLORS.lightBorder).stroke();
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#999999")
      .text("No line items found.", x, rowY + 10, {
        width: tableWidth,
        align: "center",
      });
    return rowY + 36;
  }

  items.forEach((item, index) => {
    const itemColumn = columns.find((col) => col.key === "item");
    const rowHeight = getDescriptionHeight(doc, item, itemColumn.width);

    if (index % 2 === 1) {
      doc.rect(x, rowY, tableWidth, rowHeight).fill(COLORS.altRow);
    }

    doc.rect(x, rowY, tableWidth, rowHeight).lineWidth(0.5).strokeColor(COLORS.lightBorder).stroke();

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

      if (col.key === "item") {
        drawDescriptionCell(doc, item, currentX, rowY, col.width);
      } else {
        let value = "";
        let font = "Courier";
        let fontSize = 8.2;
        let color = COLORS.text;

        switch (col.key) {
          case "sr":
            value = String(index + 1);
            font = "Helvetica";
            fontSize = 8;
            color = "#999999";
            break;
          case "qty":
            value = formatMoney(item.qty);
            break;
          case "salePrice":
            value = isWithTax ? formatMoney(item.salePriceWithTax) : formatMoney(item.salePrice);
            break;
          case "taxAmt":
            value = formatMoney(item.taxAmount);
            break;
          case "discAmt":
            value = item.hasDiscount ? formatMoney(item.discountAmount) : "0.00";
            break;
          case "total":
            value = formatMoney(item.finalTotal);
            break;
        }

        doc
          .font(font)
          .fontSize(fontSize)
          .fillColor(color)
          .text(value, currentX + 5, rowY + (rowHeight - fontSize) / 2, {
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
  const { anyDiscount, isWithTax, subTotal, taxTotal, discountTotal, grandTotal } = estimation;
  const boxWidth = mm(72);
  const tableRightX = mm(16) + (PAGE.width - mm(32));
  const boxX = tableRightX - boxWidth;
  const rowHeight = 20;
  let y = startY + 8;

  const rows = [
    ["Sub Total (PKR)", formatMoney(subTotal), false],
    ...(isWithTax ? [["Tax Total (PKR)", formatMoney(taxTotal), false]] : []),
    ...(anyDiscount ? [["Total Discount (PKR)", formatMoney(discountTotal), false]] : []),
    ["Grand Total (PKR)", formatMoney(grandTotal), true],
  ];

  const totalHeight = rows.reduce((sum, row) => sum + (row[2] ? 24 : rowHeight), 0);
  doc.rect(boxX, y, boxWidth, totalHeight).lineWidth(0.75).strokeColor(COLORS.border).stroke();

  rows.forEach(([label, value, grand], index) => {
    const height = grand ? 24 : rowHeight;

    if (grand) {
      doc.rect(boxX, y, boxWidth, height).fill(COLORS.tableHeader);
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

    y += height;
  });

  return startY + 8 + totalHeight;
};

const drawFooter = (doc, endY) => {
  const y = Math.min(endY + 12, 774);
  const x = mm(16);
  const signWidth = mm(55);
  const signX = PAGE.right - mm(16) - signWidth;

  doc
    .font("Helvetica-Oblique")
    .fontSize(7.5)
    .fillColor(COLORS.soft)
    .text(
      "This estimation is prepared for review purposes only and is subject to change.\nThank you for considering Infinity Byte Solution.",
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

export const generateEstimationPdf = async (estimationInput) => {
  await ensureDirectory();

  const estimation = normalizeEstimation(estimationInput);

  await Promise.all(
    estimation.items.map(async (item) => {
      if (item.itemImagePath && fs.existsSync(item.itemImagePath)) {
        item.imageSource = await toPdfImageSource(item.itemImagePath);
        return;
      }
      if (item.itemImageUrl) {
        item.imageSource = await toPdfImageSource(await fetchImageBuffer(item.itemImageUrl));
        return;
      }
      item.imageSource = null;
    })
  );

  const safeId = String(estimation.estimateId || estimationInput?.id || "estimation").replace(/[^\w-]/g, "-");
  const fileName = `${safeId}-${Date.now()}.pdf`;
  const filePath = path.join(estimationPdfDirectory, fileName);

  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.rect(0, 0, PAGE.width, PAGE.height).fill(COLORS.white);
  drawTopAccent(doc);
  drawHeader(doc, estimation);

  const afterSubjectY = drawSubjectAttention(doc, estimation, 110);
  drawSectionHeader(doc, "Items", afterSubjectY + 4);

  const tableEndY = drawItemsTable(doc, estimation, afterSubjectY + 20);
  const totalsEndY = drawTotals(doc, estimation, tableEndY);
  drawFooter(doc, totalsEndY + 4);

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  const publicUrl = `/uploads/estimations/${fileName}`;
  return { filePath, fileName, publicUrl };
};
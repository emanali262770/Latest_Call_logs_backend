export const DEFAULT_ESTIMATION_TEMPLATE = "executive_letterhead";

export const estimationPrintTemplates = [
  {
    id: "executive_letterhead",
    name: "Executive Letterhead",
    category: "Classic",
    description: "Clean company header with strong totals and a formal estimation layout.",
  },
  {
    id: "technical_bid",
    name: "Technical Bid",
    category: "Detailed",
    description: "Built for item-heavy estimations with product details and clear sections.",
  },
  {
    id: "premium_tax",
    name: "Premium Tax",
    category: "Premium",
    description: "Elegant gold-accented layout with discount and grand total emphasis.",
  },
  {
    id: "modern_clean",
    name: "Modern Clean",
    category: "Modern",
    description: "Soft blue card layout for a polished and readable estimation.",
  },
  {
    id: "compact_commercial",
    name: "Compact Commercial",
    category: "Compact",
    description: "Dense commercial layout for quick scanning and printing.",
  },
];

export const isValidEstimationTemplate = (templateId) =>
  estimationPrintTemplates.some((t) => t.id === templateId);

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const money = (value) =>
  Number(value || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const dummyEstimation = {
  companyName: "Infinity Byte Solution",
  address: "Abid Majeed Road, Lahore Cantt, Lahore",
  estimateId: "EST-0003",
  estimateDate: "27 April 2026",
  subject: "Estimation for cctv",
  customerName: "DG Cement",
  person: "Akram",
  designation: "Manager",
  isWithTax: true,
  items: [
    {
      itemName: "Samsung TV 55\"",
      description: "this is samsung tv",
      qty: 1,
      salePrice: 63000,
      salePriceWithTax: 74340,
      taxAmount: 11340,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 74340,
    },
    {
      itemName: "HiKvision 8 Channel NVR",
      description: "NVR Recording Unit with 1HD and AI and Motions Detasion Support",
      qty: 1,
      salePrice: 37500,
      salePriceWithTax: 44250,
      taxAmount: 6750,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 44250,
    },
    {
      itemName: "DLink 8 Port Manageable Network Switch",
      description: "DLink 8 Port Manageable Switch for Managing IT Equipments having 220 Watt Adapter",
      qty: 3,
      salePrice: 11000,
      salePriceWithTax: 12938.70,
      taxAmount: 5816.10,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 38816.10,
    },
    {
      itemName: "HiKvision 8MP IP Camera DS-260345-NVI",
      description: "IP Camera HiKvision 4 MP with 30M IR and 20X Zooming Capacity having All Features",
      qty: 12,
      salePrice: 37500,
      salePriceWithTax: 44250,
      taxAmount: 81000,
      discountPercent: 0,
      discountAmount: 0,
      finalTotal: 531000,
    },
  ],
  subTotal: 583140,
  taxTotal: 105011.10,
  discountTotal: 0,
  grandTotal: 688406.10,
};

const itemRows = (items, isWithTax, anyDiscount) =>
  items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${esc(item.itemName)}</strong><span>${esc(item.description)}</span></td>
          <td>${money(item.qty)}</td>
          <td>${money(isWithTax ? item.salePriceWithTax : item.salePrice)}</td>
          ${isWithTax ? `<td>${money(item.taxAmount)}</td>` : ""}
          ${anyDiscount ? `<td>${money(item.discountAmount)}</td>` : ""}
          <td>${money(item.finalTotal)}</td>
        </tr>`
    )
    .join("");

const thHeaders = (isWithTax, anyDiscount) => `
  <th>#</th>
  <th>Item / Description</th>
  <th>Qty</th>
  <th>Unit Price${isWithTax ? " (W/ Tax)" : ""}</th>
  ${isWithTax ? "<th>Tax Amt</th>" : ""}
  ${anyDiscount ? "<th>Discount</th>" : ""}
  <th>Final Total</th>
`;

const totalsBlock = (q) => `
  <table class="qt-total" style="margin-top:12px">
    <tr><td>Sub-Total (PKR)</td><td>${money(q.subTotal)}</td></tr>
    ${q.isWithTax ? `<tr><td>GST Amount (PKR)</td><td>${money(q.taxTotal)}</td></tr>` : ""}
    ${q.discountTotal > 0 ? `<tr><td>Discount (PKR)</td><td style="color:#c0392b">- ${money(q.discountTotal)}</td></tr>` : ""}
    <tr><td><strong>Grand Total (PKR)</strong></td><td>${money(q.grandTotal)}</td></tr>
  </table>
`;

const templateCss = `
  .et-page{width:794px;min-height:1123px;background:#fff;color:#151823;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;overflow:hidden}
  .et-page *{box-sizing:border-box;margin:0;padding:0}
  .et-company{font-size:25px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
  .et-muted{color:#667085}
  .et-kicker{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
  .qt-table{width:100%;border-collapse:collapse;font-size:11px}
  .qt-table th{font-size:9px;text-transform:uppercase;letter-spacing:1.6px;text-align:left;background:#f2f2f2}
  .qt-table td,.qt-table th{border:1px solid #d8dee8;padding:10px;vertical-align:top}
  .qt-table td:nth-child(n+3),.qt-table th:nth-child(n+3){text-align:right}
  .qt-table td:nth-child(2),.qt-table th:nth-child(2){text-align:left}
  .qt-table span{display:block;margin-top:4px;color:#667085;font-size:10px;line-height:1.35}
  .qt-total{margin-left:auto;width:300px;border-collapse:collapse;font-size:12px}
  .qt-total td{border:1px solid #d8dee8;padding:10px}
  .qt-total td:last-child{text-align:right;font-family:Courier New,monospace;font-weight:700}
  .qt-terms{font-size:10px;line-height:1.6;color:#475467;margin-top:18px}
  .qt-sign{margin-top:54px;margin-left:auto;width:220px;text-align:center;border-top:1px solid #111827;padding-top:8px;font-size:10px;font-weight:800;letter-spacing:1px}
`;

const renderExecutive = (q) => `
  <style>${templateCss}</style>
  <div class="et-page" style="padding:34px 45px;border-top:7px solid #111827">
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d0d5dd;padding-bottom:22px">
      <div><div class="et-company">${esc(q.companyName)}</div><div class="et-kicker et-muted">IT Solutions &amp; Services</div><p class="et-muted">${esc(q.address)}</p></div>
      <div style="text-align:right"><h2>${esc(q.estimateId)}</h2><p>${esc(q.estimateDate)}</p></div>
    </div>
    <div style="margin:22px 0"><div style="font-size:12px;font-weight:700">${esc(q.customerName)}</div><div style="font-size:11px;color:#555">Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div><div style="font-size:11px;margin-top:4px">Subject:- ${esc(q.subject)}</div></div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}
    <div class="qt-terms"><strong>Terms &amp; Conditions</strong><br>This estimation is prepared for review purposes only and is subject to change. Prices are valid for 30 days. Delivery will be confirmed after purchase order.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY<br><span class="et-muted">${esc(q.companyName)}</span></div>
  </div>`;

const renderTechnical = (q) => `
  <style>${templateCss}</style>
  <div class="et-page" style="display:grid;grid-template-columns:170px 1fr">
    <aside style="background:#182230;color:white;padding:34px 24px"><h1 style="font-size:28px">${esc(q.estimateId)}</h1><p>${esc(q.estimateDate)}</p><hr style="border-color:#344054"><p>${esc(q.customerName)}</p><p>${esc(q.person)}<br>${esc(q.designation)}</p></aside>
    <main style="padding:34px"><div class="et-company">${esc(q.companyName)}</div><p class="et-muted">${esc(q.address)}</p>
    <div style="margin:18px 0"><div style="font-size:12px;font-weight:700">${esc(q.customerName)}</div><div style="font-size:11px;color:#555">Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div><div style="font-size:11px;margin-top:4px">Subject:- ${esc(q.subject)}</div></div>
    <table class="qt-table" style="margin-top:14px"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}<div class="qt-terms">Warranty and delivery terms apply. Prices subject to availability.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div></main>
  </div>`;

const renderPremium = (q) => `
  <style>${templateCss}</style>
  <div class="et-page" style="padding:42px 58px;background:linear-gradient(90deg,#fff 0,#fff 94%,#0f3d2e 94%)">
    <div style="border:2px solid #c9a24d;padding:26px"><div style="display:flex;justify-content:space-between"><div><div class="et-company" style="color:#0f3d2e">${esc(q.companyName)}</div><p>${esc(q.address)}</p></div><div style="text-align:right"><h2>${esc(q.estimateId)}</h2><p>${esc(q.estimateDate)}</p></div></div>
    <div style="margin:18px 0"><div style="font-size:12px;font-weight:700">${esc(q.customerName)}</div><div style="font-size:11px;color:#555">Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div><div style="font-size:11px;margin-top:4px">Subject:- ${esc(q.subject)}</div></div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}<div class="qt-terms">This estimation is subject to availability and confirmed scope of work.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div></div>
  </div>`;

const renderModern = (q) => `
  <style>${templateCss}</style>
  <div class="et-page" style="padding:38px;background:#f4f8fb">
    <section style="background:#1264a3;color:white;padding:28px;border-radius:22px"><div style="display:flex;justify-content:space-between"><h1>${esc(q.companyName)}</h1><div style="text-align:right"><h2>${esc(q.estimateId)}</h2><p>${esc(q.estimateDate)}</p></div></div><p>${esc(q.address)}</p></section>
    <section style="background:white;border:1px solid #d0e3f1;border-radius:18px;padding:22px;margin-top:18px"><div style="margin-bottom:14px"><div style="font-size:12px;font-weight:700">${esc(q.customerName)}</div><div style="font-size:11px;color:#555">Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div><div style="font-size:11px;margin-top:4px">Subject:- ${esc(q.subject)}</div></div><table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>${totalsBlock(q)}</section><div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const renderCompact = (q) => `
  <style>${templateCss}</style>
  <div class="et-page" style="padding:28px 42px">
    <div style="background:#111827;color:white;padding:18px 22px;display:flex;justify-content:space-between"><div><div class="et-company" style="font-size:20px">${esc(q.companyName)}</div><div style="color:#cbd5e1">${esc(q.address)}</div></div><div style="text-align:right"><strong>${esc(q.estimateId)}</strong><br>${esc(q.estimateDate)}</div></div>
    <div style="margin:16px 0"><div style="font-size:12px;font-weight:700">${esc(q.customerName)}</div><div style="font-size:11px;color:#555">Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div><div style="font-size:11px;margin-top:4px">Subject:- ${esc(q.subject)}</div></div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}<div class="qt-terms">This estimation is prepared for review purposes only and is subject to change. Thank you for considering ${esc(q.companyName)}.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const previewRenderers = {
  executive_letterhead: renderExecutive,
  technical_bid: renderTechnical,
  premium_tax: renderPremium,
  modern_clean: renderModern,
  compact_commercial: renderCompact,
};

export const getEstimationTemplateById = (templateId) =>
  estimationPrintTemplates.find((t) => t.id === templateId) ||
  estimationPrintTemplates.find((t) => t.id === DEFAULT_ESTIMATION_TEMPLATE);

export const getEstimationPrintTemplates = () =>
  estimationPrintTemplates.map((template) => ({
    ...template,
    previewHtml: previewRenderers[template.id](dummyEstimation),
  }));

export const renderEstimationHtml = (estimationData, companyData) => {
  const isWithTax = /^withtax$/i.test(
    String(estimationData?.taxMode || estimationData?.tax_mode || "").replace(/\s+/g, "")
  );

  const items = (Array.isArray(estimationData?.items) ? estimationData.items : []).map((item) => {
    const qty = Number(item?.qty ?? 0);
    const salePrice = Number(item?.salePrice ?? item?.sale_price ?? 0);
    const salePriceWithTax = Number(item?.salePriceWithTax ?? item?.sale_price_with_tax ?? 0);
    const saleTotal = Number(item?.saleTotal ?? item?.sale_total ?? salePrice * qty);
    const saleTotalWithTax = Number(item?.saleTotalWithTax ?? item?.sale_total_with_tax ?? salePriceWithTax * qty);
    const taxAmount = saleTotalWithTax - saleTotal;
    return {
      itemName: String(item?.itemName || item?.item_name || ""),
      description: String(item?.description || ""),
      qty,
      salePrice,
      salePriceWithTax,
      saleTotal,
      saleTotalWithTax,
      taxAmount,
      discountPercent: Number(item?.discountPercent ?? item?.discount_percent ?? 0),
      discountAmount: Number(item?.discountAmount ?? item?.discount_amount ?? 0),
      finalTotal: Number(item?.finalTotal ?? item?.final_total ?? 0),
    };
  });

  const q = {
    companyName: String(companyData?.company_name || companyData?.name || "Infinity Byte Solution"),
    address: String(companyData?.address || companyData?.company_address || ""),
    estimateId: String(estimationData?.estimateId || estimationData?.estimate_id || ""),
    estimateDate: (() => {
      const s = String(estimationData?.estimateDate || estimationData?.estimate_date || "").trim();
      if (!s) return "";
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    })(),
    subject: `Estimation for ${String(estimationData?.service || estimationData?.serviceName || estimationData?.service_name || "")}`,
    customerName: String(estimationData?.customerCompany || estimationData?.customerName || estimationData?.customer_name || ""),
    person: String(estimationData?.person || ""),
    designation: String(estimationData?.designation || ""),
    isWithTax,
    items,
    subTotal: Number(estimationData?.summary?.saleTotal ?? estimationData?.saleTotal ?? 0),
    taxTotal: Number(estimationData?.summary?.taxTotal ?? estimationData?.taxTotal ?? 0),
    discountTotal: Number(estimationData?.summary?.discountTotal ?? estimationData?.discountTotal ?? 0),
    grandTotal: Number(estimationData?.summary?.finalTotal ?? estimationData?.finalTotal ?? estimationData?.grandTotal ?? 0),
  };

  const templateId = String(estimationData?.printTemplate || estimationData?.print_template || DEFAULT_ESTIMATION_TEMPLATE);
  const renderer = previewRenderers[templateId] || previewRenderers[DEFAULT_ESTIMATION_TEMPLATE];
  const body = renderer(q);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Estimation ${esc(q.estimateId)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    html, body { background: #ffffff; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${body}</body>
</html>`;
};

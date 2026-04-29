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
  .et-page{width:794px;min-height:1123px;background:#fff;color:#111827;font-family:"Segoe UI",Arial,Helvetica,sans-serif;box-sizing:border-box;overflow:hidden}
  .et-page *{box-sizing:border-box;margin:0;padding:0}
  .et-rule{height:2px;background:#111827}
  .et-company{font-size:24px;font-weight:800;letter-spacing:.6px;text-transform:uppercase}
  .et-subtitle{font-size:10px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#6b7280}
  .et-muted{color:#6b7280}
  .et-meta-label{font-size:9px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#6b7280}
  .et-meta-value{font-size:12px;font-weight:700;color:#111827}
  .et-client{border-left:3px solid #111827;padding-left:14px;margin:24px 0 18px}
  .et-client div:nth-child(1){font-size:13px;font-weight:700}
  .et-client div:nth-child(2),.et-client div:nth-child(3){font-size:11px;color:#4b5563;margin-top:4px}
  .qt-table{width:100%;border-collapse:collapse;font-size:11px}
  .qt-table th{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;text-align:left;padding:9px 10px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827}
  .qt-table td{border:1px solid #d1d5db;padding:9px 10px;vertical-align:top}
  .qt-table td:nth-child(n+3),.qt-table th:nth-child(n+3){text-align:right}
  .qt-table td:nth-child(2),.qt-table th:nth-child(2){text-align:left}
  .qt-table span{display:block;margin-top:4px;color:#6b7280;font-size:10px;line-height:1.35}
  .qt-total{margin-left:auto;width:312px;border-collapse:collapse;font-size:12px;margin-top:14px}
  .qt-total td{border:1px solid #d1d5db;padding:10px 12px}
  .qt-total td:last-child{text-align:right;font-family:"Courier New",monospace;font-weight:700}
  .qt-terms{font-size:10px;line-height:1.65;color:#4b5563;margin-top:18px}
  .qt-sign{margin-top:54px;margin-left:auto;width:220px;text-align:center;border-top:1px solid #111827;padding-top:8px;font-size:10px;font-weight:800;letter-spacing:1px}
`;

const renderExecutive = (q) => `
  <style>${templateCss}
    .exec{padding:30px 42px 38px}
    .exec .head{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 0 18px;border-bottom:1px solid #cfd4dc}
    .exec .meta{text-align:right;min-width:150px}
    .exec .qt-table th{background:#111827;border-color:#374151;color:#fff}
    .exec .qt-total tr:last-child td{background:#111827;color:#fff;border-color:#111827}
  </style>
  <div class="et-page exec">
    <div class="et-rule"></div>
    <div class="head">
      <div>
        <div class="et-company">${esc(q.companyName)}</div>
        <div class="et-subtitle">IT Solutions &amp; Services</div>
        <div class="et-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="meta">
        <div class="et-meta-label">Estimation No</div>
        <div class="et-meta-value" style="margin-top:5px">${esc(q.estimateId)}</div>
        <div class="et-meta-label" style="margin-top:14px">Date</div>
        <div style="font-size:11px;margin-top:5px">${esc(q.estimateDate)}</div>
      </div>
    </div>
    <div class="et-client">
      <div>${esc(q.customerName)}</div>
      <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
      <div>${esc(q.subject)}</div>
    </div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}
    <div class="qt-terms"><strong>Terms &amp; Conditions</strong><br>This estimation is prepared for review purposes only and is subject to scope confirmation, stock availability, and formal approval.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY<br><span class="et-muted">${esc(q.companyName)}</span></div>
  </div>`;

const renderTechnical = (q) => `
  <style>${templateCss}
    .tech{display:grid;grid-template-columns:162px 1fr}
    .tech .rail{background:#1f2937;color:#f9fafb;padding:34px 22px 28px}
    .tech .rail .et-meta-label{color:#9ca3af}
    .tech .rail .et-meta-value{color:#fff}
    .tech .body{padding:28px 34px 38px}
    .tech .et-company{font-size:22px}
    .tech .et-client{border-left-color:#374151;margin-top:20px}
    .tech .qt-table th{background:#4b5563;border-color:#6b7280;color:#fff}
    .tech .qt-total tr:last-child td{background:#4b5563;color:#fff;border-color:#4b5563;font-weight:800}
  </style>
  <div class="et-page tech">
    <aside class="rail">
      <div class="et-meta-label">Estimate</div>
      <div class="et-meta-value" style="margin-top:6px;font-size:16px">${esc(q.estimateId)}</div>
      <div class="et-meta-label" style="margin-top:18px">Date</div>
      <div style="margin-top:6px;font-size:11px">${esc(q.estimateDate)}</div>
      <div class="et-meta-label" style="margin-top:28px">Client</div>
      <div style="margin-top:8px;font-size:12px;line-height:1.6">${esc(q.customerName)}<br>${esc(q.person)}<br>${esc(q.designation)}</div>
    </aside>
    <main class="body">
      <div class="et-rule" style="background:#374151"></div>
      <div style="padding-top:16px">
        <div class="et-company">${esc(q.companyName)}</div>
        <div class="et-subtitle">Commercial Estimation</div>
        <div class="et-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="et-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
      <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
      ${totalsBlock(q)}
      <div class="qt-terms">Prepared as a technical commercial estimate. Final commercial terms remain subject to approved scope and execution conditions.</div>
      <div class="qt-sign">AUTHORIZED SIGNATORY</div>
    </main>
  </div>`;

const renderPremium = (q) => `
  <style>${templateCss}
    .premium{padding:38px 48px 42px}
    .premium .frame{border:1px solid #b6aa92;padding:24px 26px 28px}
    .premium .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d6d0c4;padding-bottom:18px}
    .premium .et-company{font-family:Georgia,"Times New Roman",serif;font-size:27px;font-weight:700;letter-spacing:.4px;text-transform:none}
    .premium .et-subtitle,.premium .et-meta-label{color:#7c6f58}
    .premium .et-client{border-left-color:#8a7a60}
    .premium .qt-table th{background:#8a7a60;border-color:#b6aa92;color:#fff}
    .premium .qt-table td{border-color:#d7cfbf}
    .premium .qt-total td{border-color:#d7cfbf}
    .premium .qt-total tr:last-child td{background:#8a7a60;color:#fff;border-color:#8a7a60;font-weight:800}
  </style>
  <div class="et-page premium">
    <div class="frame">
      <div class="top">
        <div>
          <div class="et-company">${esc(q.companyName)}</div>
          <div class="et-subtitle">Formal Commercial Estimate</div>
          <div class="et-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
        </div>
        <div style="text-align:right">
          <div class="et-meta-label">Estimate Ref</div>
          <div class="et-meta-value" style="margin-top:6px">${esc(q.estimateId)}</div>
          <div class="et-meta-label" style="margin-top:14px">Issue Date</div>
          <div style="font-size:11px;margin-top:6px">${esc(q.estimateDate)}</div>
        </div>
      </div>
      <div class="et-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
      <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
      ${totalsBlock(q)}
      <div class="qt-terms">This document reflects the current assessed scope and commercial rates. Any change in specification, quantity, or delivery conditions may require revision.</div>
      <div class="qt-sign" style="border-top-color:#8a7a60">AUTHORIZED SIGNATORY</div>
    </div>
  </div>`;

const renderModern = (q) => `
  <style>${templateCss}
    .modern{padding:32px 40px 38px}
    .modern .head{display:grid;grid-template-columns:1fr 190px;gap:20px;align-items:end;padding-bottom:18px;border-bottom:2px solid #9ca3af}
    .modern .et-company{font-size:23px}
    .modern .panel{background:#f9fafb;border:1px solid #d1d5db;padding:18px 20px}
    .modern .et-client{margin:0;border-left-color:#6b7280}
    .modern .qt-table{margin-top:18px}
    .modern .qt-table th{background:#6b7280;border-color:#9ca3af;color:#fff}
    .modern .qt-total{width:320px}
    .modern .qt-total tr:last-child td{background:#6b7280;color:#fff;border-color:#6b7280}
  </style>
  <div class="et-page modern">
    <div class="head">
      <div>
        <div class="et-company">${esc(q.companyName)}</div>
        <div class="et-subtitle">Estimate Statement</div>
        <div class="et-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="panel">
        <div class="et-meta-label">Estimation No</div>
        <div class="et-meta-value" style="margin-top:5px">${esc(q.estimateId)}</div>
        <div class="et-meta-label" style="margin-top:12px">Date</div>
        <div style="font-size:11px;margin-top:5px">${esc(q.estimateDate)}</div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="et-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
    </div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}
    <div class="qt-terms">Estimate values are based on the present technical brief and may be adjusted against final approved material or execution requirements.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const renderCompact = (q) => `
  <style>${templateCss}
    .compact{padding:26px 34px 34px}
    .compact .bar{background:#111827;color:#fff;padding:14px 18px;display:grid;grid-template-columns:1fr 150px;gap:20px;align-items:center}
    .compact .bar .et-company{font-size:20px}
    .compact .bar .et-subtitle{color:#d1d5db;letter-spacing:1.6px}
    .compact .block{border:1px solid #cfd4dc;border-top:none;padding:14px 18px}
    .compact .et-client{margin:0;border-left-color:#111827}
    .compact .qt-table th{background:#1f2937;border-color:#4b5563;color:#fff}
    .compact .qt-table td,.compact .qt-table th{padding:8px}
    .compact .qt-total{width:300px}
    .compact .qt-total tr:last-child td{background:#1f2937;color:#fff;border-color:#1f2937;font-weight:800}
  </style>
  <div class="et-page compact">
    <div class="bar">
      <div>
        <div class="et-company">${esc(q.companyName)}</div>
        <div class="et-subtitle">Commercial Estimate</div>
      </div>
      <div style="text-align:right;font-size:11px;line-height:1.7">
        <div><strong>${esc(q.estimateId)}</strong></div>
        <div>${esc(q.estimateDate)}</div>
      </div>
    </div>
    <div class="block">
      <div class="et-muted" style="font-size:11px;margin-bottom:12px">${esc(q.address)}</div>
      <div class="et-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
    </div>
    <table class="qt-table"><thead><tr>${thHeaders(q.isWithTax, q.discountTotal > 0)}</tr></thead><tbody>${itemRows(q.items, q.isWithTax, q.discountTotal > 0)}</tbody></table>
    ${totalsBlock(q)}
    <div class="qt-terms">Prepared for internal review and commercial alignment. Rates remain subject to approval, availability, and final work confirmation.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY</div>
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

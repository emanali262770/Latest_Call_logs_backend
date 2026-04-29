export const DEFAULT_QUOTATION_TEMPLATE = "executive_letterhead";

export const quotationPrintTemplates = [
  {
    id: "executive_letterhead",
    name: "Executive Letterhead",
    category: "Classic",
    description: "Clean company header with strong totals and a formal quotation layout.",
  },
  {
    id: "technical_bid",
    name: "Technical Bid",
    category: "Detailed",
    description: "Built for item-heavy quotations with product details and clear sections.",
  },
  {
    id: "premium_tax",
    name: "Premium Tax",
    category: "Premium",
    description: "Elegant gold-accented layout with tax and grand total emphasis.",
  },
  {
    id: "modern_clean",
    name: "Modern Clean",
    category: "Modern",
    description: "Soft blue card layout for a polished and readable quotation.",
  },
  {
    id: "compact_commercial",
    name: "Compact Commercial",
    category: "Compact",
    description: "Dense commercial offer layout for quick scanning and printing.",
  },
];

export const isValidQuotationTemplate = (templateId) =>
  quotationPrintTemplates.some((template) => template.id === templateId);

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

const dummyQuotation = {
  companyName: "Infinity Byte Solution",
  address: "Abid Majeed Road, Lahore Cantt, Lahore",
  quotationNo: "AIT/QUT/0002",
  quotationDate: "27 April 2026",
  subject: "Quotation for cctv",
  customerName: "PEEF",
  person: "Ahmed Zaki",
  designation: "Manager",
  department: "Administration",
  items: [
    {
      itemName: "HiKvision 8MP IP Camera DS-260345-NVI",
      description: "IP Camera HiKvision 4 MP with 30M IR and motion detection.",
      rate: 37500,
      qty: 5,
      gstAmount: 6750,
      rateWithGst: 44250,
      totalWithGst: 221250,
    },
    {
      itemName: "HiKvision 8 Channel NVR",
      description: "NVR recording unit with AI support.",
      rate: 37500,
      qty: 1,
      gstAmount: 6750,
      rateWithGst: 44250,
      totalWithGst: 44250,
    },
    {
      itemName: "DLink Cat6 Cable Copper",
      description: "Twisted pair Cat6 shielded cable.",
      rate: 40640,
      qty: 1,
      gstAmount: 7315.2,
      rateWithGst: 47955.2,
      totalWithGst: 47955.2,
    },
  ],
  subTotal: 275540,
  gstTotal: 21409.2,
  grandTotal: 325137.2,
};

const tableRows = (items) =>
  items
    .map(
      (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td><strong>${esc(item.itemName)}</strong><span>${esc(item.description)}</span></td>
          <td>${money(item.rate)}</td>
          <td>${money(item.qty)}</td>
          <td>${money(item.gstAmount)}</td>
          <td>${money(item.rateWithGst)}</td>
          <td>${money(item.totalWithGst)}</td>
        </tr>`
    )
    .join("");

const templateCss = `
  .qt-page{width:794px;min-height:1123px;background:#fff;color:#111827;font-family:"Segoe UI",Arial,Helvetica,sans-serif;box-sizing:border-box;overflow:hidden}
  .qt-page *{box-sizing:border-box;margin:0;padding:0}
  .qt-rule{height:2px;background:#111827}
  .qt-company{font-size:24px;font-weight:800;letter-spacing:.6px;text-transform:uppercase}
  .qt-subtitle{font-size:10px;font-weight:700;letter-spacing:2.4px;text-transform:uppercase;color:#6b7280}
  .qt-muted{color:#6b7280}
  .qt-meta-label{font-size:9px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#6b7280}
  .qt-meta-value{font-size:12px;font-weight:700;color:#111827}
  .qt-client{border-left:3px solid #111827;padding-left:14px;margin:24px 0 18px}
  .qt-client div:nth-child(1){font-size:13px;font-weight:700}
  .qt-client div:nth-child(2),.qt-client div:nth-child(3){font-size:11px;color:#4b5563;margin-top:4px}
  .qt-table{width:100%;border-collapse:collapse;font-size:11px}
  .qt-table th{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:1.3px;text-align:left;padding:9px 10px;border:1px solid #d1d5db;background:#f3f4f6;color:#111827}
  .qt-table td{border:1px solid #d1d5db;padding:9px 10px;vertical-align:top}
  .qt-table td:nth-child(n+3),.qt-table th:nth-child(n+3){text-align:right}
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
  <div class="qt-page exec">
    <div class="qt-rule"></div>
    <div class="head">
      <div>
        <div class="qt-company">${esc(q.companyName)}</div>
        <div class="qt-subtitle">IT Solutions &amp; Services</div>
        <div class="qt-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="meta">
        <div class="qt-meta-label">Quotation No</div>
        <div class="qt-meta-value" style="margin-top:5px">${esc(q.quotationNo)}</div>
        <div class="qt-meta-label" style="margin-top:14px">Date</div>
        <div style="font-size:11px;margin-top:5px">${esc(q.quotationDate)}</div>
      </div>
    </div>
    <div class="qt-client">
      <div>${esc(q.customerName)}</div>
      <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
      <div>${esc(q.subject)}</div>
    </div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total"><tr><td>Sub-Total (PKR)</td><td>${money(q.subTotal)}</td></tr><tr><td>GST Amount (PKR)</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Grand Total (PKR)</strong></td><td>${money(q.grandTotal)}</td></tr></table>
    <div class="qt-terms"><strong>Terms &amp; Conditions</strong><br>This quotation is submitted against the current scope and remains subject to commercial approval, stock confirmation, and delivery scheduling.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY<br><span class="qt-muted">${esc(q.companyName)}</span></div>
  </div>`;

const renderTechnical = (q) => `
  <style>${templateCss}
    .tech{display:grid;grid-template-columns:162px 1fr}
    .tech .rail{background:#1f2937;color:#f9fafb;padding:34px 22px 28px}
    .tech .rail .qt-meta-label{color:#9ca3af}
    .tech .rail .qt-meta-value{color:#fff}
    .tech .body{padding:28px 34px 38px}
    .tech .qt-company{font-size:22px}
    .tech .qt-client{border-left-color:#374151;margin-top:20px}
    .tech .qt-table th{background:#4b5563;border-color:#6b7280;color:#fff}
  </style>
  <div class="qt-page tech">
    <aside class="rail">
      <div class="qt-meta-label">Quotation</div>
      <div class="qt-meta-value" style="margin-top:6px;font-size:16px">${esc(q.quotationNo)}</div>
      <div class="qt-meta-label" style="margin-top:18px">Date</div>
      <div style="margin-top:6px;font-size:11px">${esc(q.quotationDate)}</div>
      <div class="qt-meta-label" style="margin-top:28px">Client</div>
      <div style="margin-top:8px;font-size:12px;line-height:1.6">${esc(q.customerName)}<br>${esc(q.person)}<br>${esc(q.department)}</div>
    </aside>
    <main class="body">
      <div class="qt-rule" style="background:#374151"></div>
      <div style="padding-top:16px">
        <div class="qt-company">${esc(q.companyName)}</div>
        <div class="qt-subtitle">Technical Commercial Offer</div>
        <div class="qt-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="qt-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
      <table class="qt-table"><thead><tr><th>#</th><th>Product Specification</th><th>Rate</th><th>Qty</th><th>GST</th><th>Incl.</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
      <table class="qt-total"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>Tax</td><td>${money(q.gstTotal)}</td></tr><tr style="background:#4b5563;color:#fff"><td><strong>Payable</strong></td><td>${money(q.grandTotal)}</td></tr></table>
      <div class="qt-terms">Prepared as a structured commercial quotation for technical review, budgeting, and management approval.</div>
      <div class="qt-sign">AUTHORIZED SIGNATORY</div>
    </main>
  </div>`;

const renderPremium = (q) => `
  <style>${templateCss}
    .premium{padding:38px 48px 42px}
    .premium .frame{border:1px solid #b6aa92;padding:24px 26px 28px}
    .premium .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:1px solid #d6d0c4;padding-bottom:18px}
    .premium .qt-company{font-family:Georgia,"Times New Roman",serif;font-size:27px;font-weight:700;letter-spacing:.4px;text-transform:none}
    .premium .qt-subtitle,.premium .qt-meta-label{color:#7c6f58}
    .premium .qt-client{border-left-color:#8a7a60}
    .premium .qt-table th{background:#8a7a60;border-color:#b6aa92;color:#fff}
    .premium .qt-table td{border-color:#d7cfbf}
    .premium .qt-total td{border-color:#d7cfbf}
    .premium .qt-total tr:last-child td{background:#8a7a60;color:#fff;border-color:#8a7a60;font-weight:800}
  </style>
  <div class="qt-page premium">
    <div class="frame">
      <div class="top">
        <div>
          <div class="qt-company">${esc(q.companyName)}</div>
          <div class="qt-subtitle">Formal Quotation</div>
          <div class="qt-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
        </div>
        <div style="text-align:right">
          <div class="qt-meta-label">Quotation Ref</div>
          <div class="qt-meta-value" style="margin-top:6px">${esc(q.quotationNo)}</div>
          <div class="qt-meta-label" style="margin-top:14px">Issue Date</div>
          <div style="font-size:11px;margin-top:6px">${esc(q.quotationDate)}</div>
        </div>
      </div>
      <div class="qt-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
      <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
      <table class="qt-total"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST Amount</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Grand Total</strong></td><td>${money(q.grandTotal)}</td></tr></table>
      <div class="qt-terms">This quotation reflects the present scope, commercial assumptions, and tax treatment. Any variation in quantity or delivery terms may require revision.</div>
      <div class="qt-sign" style="border-top-color:#8a7a60">AUTHORIZED SIGNATORY</div>
    </div>
  </div>`;

const renderModern = (q) => `
  <style>${templateCss}
    .modern{padding:32px 40px 38px}
    .modern .head{display:grid;grid-template-columns:1fr 190px;gap:20px;align-items:end;padding-bottom:18px;border-bottom:2px solid #9ca3af}
    .modern .qt-company{font-size:23px}
    .modern .panel{background:#f9fafb;border:1px solid #d1d5db;padding:18px 20px}
    .modern .qt-client{margin:0;border-left-color:#6b7280}
    .modern .qt-table{margin-top:18px}
    .modern .qt-table th{background:#6b7280;border-color:#9ca3af;color:#fff}
    .modern .qt-total{width:320px}
    .modern .qt-total tr:last-child td{background:#6b7280;color:#fff;border-color:#6b7280}
  </style>
  <div class="qt-page modern">
    <div class="head">
      <div>
        <div class="qt-company">${esc(q.companyName)}</div>
        <div class="qt-subtitle">Quotation Statement</div>
        <div class="qt-muted" style="margin-top:8px;font-size:11px">${esc(q.address)}</div>
      </div>
      <div class="panel">
        <div class="qt-meta-label">Quotation No</div>
        <div class="qt-meta-value" style="margin-top:5px">${esc(q.quotationNo)}</div>
        <div class="qt-meta-label" style="margin-top:12px">Date</div>
        <div style="font-size:11px;margin-top:5px">${esc(q.quotationDate)}</div>
      </div>
    </div>
    <div class="panel" style="margin-top:18px">
      <div class="qt-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
    </div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Total</strong></td><td>${money(q.grandTotal)}</td></tr></table>
    <div class="qt-terms">Quotation values are based on the submitted requirement and may be updated once final specifications, quantities, or execution responsibilities are confirmed.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const renderCompact = (q) => `
  <style>${templateCss}
    .compact{padding:26px 34px 34px}
    .compact .bar{background:#111827;color:#fff;padding:14px 18px;display:grid;grid-template-columns:1fr 150px;gap:20px;align-items:center}
    .compact .bar .qt-company{font-size:20px}
    .compact .bar .qt-subtitle{color:#d1d5db;letter-spacing:1.6px}
    .compact .block{border:1px solid #cfd4dc;border-top:none;padding:14px 18px}
    .compact .qt-client{margin:0;border-left-color:#111827}
    .compact .qt-table th{background:#1f2937;border-color:#4b5563;color:#fff}
    .compact .qt-table td,.compact .qt-table th{padding:8px}
    .compact .qt-total{width:300px}
    .compact .qt-total tr:last-child td{background:#1f2937;color:#fff;border-color:#1f2937;font-weight:800}
  </style>
  <div class="qt-page compact">
    <div class="bar">
      <div>
        <div class="qt-company">${esc(q.companyName)}</div>
        <div class="qt-subtitle">Commercial Quotation</div>
      </div>
      <div style="text-align:right;font-size:11px;line-height:1.7">
        <div><strong>${esc(q.quotationNo)}</strong></div>
        <div>${esc(q.quotationDate)}</div>
      </div>
    </div>
    <div class="block">
      <div class="qt-muted" style="font-size:11px;margin-bottom:12px">${esc(q.address)}</div>
      <div class="qt-client">
        <div>${esc(q.customerName)}</div>
        <div>Attn: ${esc(q.person)}${q.person && q.designation ? ' - ' : ''}${esc(q.designation)}</div>
        <div>${esc(q.subject)}</div>
      </div>
    </div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Rate</th><th>Qty</th><th>GST</th><th>Incl.</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Grand Total</strong></td><td>${money(q.grandTotal)}</td></tr></table>
    <div class="qt-terms">Quoted rates are subject to scope lock, stock availability, payment clearance, and confirmation of commercial execution terms.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const previewRenderers = {
  executive_letterhead: renderExecutive,
  technical_bid: renderTechnical,
  premium_tax: renderPremium,
  modern_clean: renderModern,
  compact_commercial: renderCompact,
};

export const getQuotationTemplateById = (templateId) =>
  quotationPrintTemplates.find((template) => template.id === templateId) ||
  quotationPrintTemplates.find((template) => template.id === DEFAULT_QUOTATION_TEMPLATE);

export const getQuotationPrintTemplates = () =>
  quotationPrintTemplates.map((template) => ({
    ...template,
    previewHtml: previewRenderers[template.id](dummyQuotation),
  }));

export const renderQuotationHtml = (quotationData, companyData) => {
  const q = {
    companyName: String(companyData?.company_name || companyData?.name || "Infinity Byte Solution"),
    address: String(companyData?.address || companyData?.company_address || ""),
    quotationNo: String(quotationData?.quotationNo || quotationData?.quotation_no || ""),
    quotationDate: (() => {
      const s = String(quotationData?.quotationDate || quotationData?.quotation_date || "").trim();
      if (!s) return "";
      const d = new Date(s);
      return isNaN(d.getTime()) ? s : d.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
    })(),
    subject: `Quotation for ${String(quotationData?.forProduct || quotationData?.serviceName || quotationData?.service_name || "")}`,
    customerName: String(quotationData?.company || quotationData?.customerName || quotationData?.customer_name || ""),
    person: String(quotationData?.person || ""),
    designation: String(quotationData?.designation || ""),
    department: String(quotationData?.department || ""),
    items: (Array.isArray(quotationData?.items) ? quotationData.items : []).map((item) => ({
      itemName: String(item?.itemName || item?.item_name || item?.item || ""),
      description: String(item?.description || item?.itemName || item?.item_name || item?.item || ""),
      rate: Number(item?.rate ?? item?.price ?? 0),
      qty: Number(item?.qty ?? 0),
      gstAmount: Number(item?.gstAmount ?? item?.gst_amount ?? 0),
      rateWithGst: Number(item?.rateWithGst ?? item?.rate_with_gst ?? item?.rate ?? item?.price ?? 0),
      totalWithGst: Number(item?.totalWithGst ?? item?.total_with_gst ?? item?.total ?? 0),
    })),
    subTotal: Number(quotationData?.summary?.subTotal ?? quotationData?.subTotal ?? 0),
    gstTotal: Number(quotationData?.summary?.gstTotal ?? quotationData?.gstTotal ?? 0),
    grandTotal: Number(quotationData?.summary?.grandTotal ?? quotationData?.grandTotal ?? 0),
  };

  const templateId = String(quotationData?.printTemplate || quotationData?.print_template || DEFAULT_QUOTATION_TEMPLATE);
  const renderer = previewRenderers[templateId] || previewRenderers[DEFAULT_QUOTATION_TEMPLATE];
  const body = renderer(q);

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Quotation ${esc(q.quotationNo)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @page { size: A4 portrait; margin: 0; }
    html, body { background: #ffffff; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>${body}</body>
</html>`;
};

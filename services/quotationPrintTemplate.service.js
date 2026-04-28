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
  .qt-page{width:794px;min-height:1123px;background:#fff;color:#151823;font-family:Arial,Helvetica,sans-serif;box-sizing:border-box;overflow:hidden}
  .qt-page *{box-sizing:border-box}
  .qt-company{font-size:25px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
  .qt-muted{color:#667085}
  .qt-kicker{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase}
  .qt-table{width:100%;border-collapse:collapse;font-size:11px}
  .qt-table th{font-size:9px;text-transform:uppercase;letter-spacing:1.6px;text-align:left}
  .qt-table td,.qt-table th{border:1px solid #d8dee8;padding:10px;vertical-align:top}
  .qt-table td:nth-child(n+3),.qt-table th:nth-child(n+3){text-align:right}
  .qt-table span{display:block;margin-top:4px;color:#667085;font-size:10px;line-height:1.35}
  .qt-total{margin-left:auto;width:280px;border-collapse:collapse;font-size:12px}
  .qt-total td{border:1px solid #d8dee8;padding:10px}
  .qt-total td:last-child{text-align:right;font-family:Courier New,monospace;font-weight:700}
  .qt-terms{font-size:10px;line-height:1.6;color:#475467;margin-top:18px}
  .qt-sign{margin-top:54px;margin-left:auto;width:220px;text-align:center;border-top:1px solid #111827;padding-top:8px;font-size:10px;font-weight:800;letter-spacing:1px}
`;

const renderExecutive = (q) => `
  <style>${templateCss}</style>
  <div class="qt-page" style="padding:34px 54px;border-top:7px solid #111827">
    <div style="display:flex;justify-content:space-between;border-bottom:1px solid #d0d5dd;padding-bottom:22px">
      <div><div class="qt-company">${esc(q.companyName)}</div><div class="qt-kicker qt-muted">IT Solutions & Services</div><p class="qt-muted">${esc(q.address)}</p></div>
      <div style="text-align:right"><div class="qt-kicker qt-muted">Quotation</div><h2>${esc(q.quotationNo)}</h2><p>${esc(q.quotationDate)}</p></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;margin:28px 0">
      <div><div class="qt-kicker qt-muted">Subject</div><h3>${esc(q.subject)}</h3></div>
      <div><div class="qt-kicker qt-muted">Attention</div><h3>${esc(q.person)} - ${esc(q.designation)}</h3><p>${esc(q.department)}</p></div>
    </div>
    <div class="qt-kicker" style="margin-bottom:10px">Commercial Offer</div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total" style="margin-top:12px"><tr><td>Sub-Total (PKR)</td><td>${money(q.subTotal)}</td></tr><tr><td>GST Amount (PKR)</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Grand Total (PKR)</strong></td><td>${money(q.grandTotal)}</td></tr></table>
    <div class="qt-terms"><strong>Terms & Conditions</strong><br>Quoted prices are valid for 30 days. Delivery will be confirmed after purchase order. Payment terms: 50% advance and remaining before handover.</div>
    <div class="qt-sign">AUTHORIZED SIGNATORY<br><span class="qt-muted">${esc(q.companyName)}</span></div>
  </div>`;

const renderTechnical = (q) => `
  <style>${templateCss}</style>
  <div class="qt-page" style="display:grid;grid-template-columns:170px 1fr">
    <aside style="background:#182230;color:white;padding:34px 24px"><div class="qt-kicker" style="color:#9ec5ff">Technical Bid</div><h1 style="font-size:28px">${esc(q.quotationNo)}</h1><p>${esc(q.quotationDate)}</p><hr style="border-color:#344054"><p>${esc(q.customerName)}</p><p>${esc(q.person)}<br>${esc(q.department)}</p></aside>
    <main style="padding:34px"><div class="qt-company">${esc(q.companyName)}</div><p class="qt-muted">${esc(q.address)}</p><h2 style="margin-top:30px">${esc(q.subject)}</h2>
    <table class="qt-table"><thead><tr><th>#</th><th>Product Specification</th><th>Rate</th><th>Qty</th><th>GST</th><th>Incl.</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total" style="margin-top:18px"><tr><td>Subtotal</td><td>${money(q.subTotal)}</td></tr><tr><td>Tax</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Payable</strong></td><td>${money(q.grandTotal)}</td></tr></table><div class="qt-terms">Warranty and delivery terms apply as mentioned in the commercial offer.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div></main>
  </div>`;

const renderPremium = (q) => `
  <style>${templateCss}</style>
  <div class="qt-page" style="padding:42px 58px;background:linear-gradient(90deg,#fff 0,#fff 94%,#0f3d2e 94%)">
    <div style="border:2px solid #c9a24d;padding:26px"><div style="display:flex;justify-content:space-between"><div><div class="qt-kicker" style="color:#b2872f">Premium Quotation</div><div class="qt-company" style="color:#0f3d2e">${esc(q.companyName)}</div><p>${esc(q.address)}</p></div><div style="text-align:right"><h2>${esc(q.quotationNo)}</h2><p>${esc(q.quotationDate)}</p></div></div>
    <div style="background:#f8f3e6;padding:16px;margin:22px 0;display:flex;justify-content:space-between"><strong>${esc(q.subject)}</strong><span>${esc(q.person)} / ${esc(q.department)}</span></div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total" style="margin-top:14px"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST Amount</td><td>${money(q.gstTotal)}</td></tr><tr style="background:#0f3d2e;color:white"><td>Grand Total</td><td>${money(q.grandTotal)}</td></tr></table><div class="qt-terms">This quotation is subject to taxes, availability, and confirmed scope of work.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div></div>
  </div>`;

const renderModern = (q) => `
  <style>${templateCss}</style>
  <div class="qt-page" style="padding:38px;background:#f4f8fb">
    <section style="background:#1264a3;color:white;padding:28px;border-radius:22px"><div class="qt-kicker" style="color:#b9e6fe">Quotation</div><div style="display:flex;justify-content:space-between"><h1>${esc(q.companyName)}</h1><div style="text-align:right"><h2>${esc(q.quotationNo)}</h2><p>${esc(q.quotationDate)}</p></div></div><p>${esc(q.address)}</p></section>
    <section style="background:white;border:1px solid #d0e3f1;border-radius:18px;padding:22px;margin-top:18px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:18px"><div><div class="qt-kicker qt-muted">For Product</div><h3>${esc(q.subject)}</h3></div><div><div class="qt-kicker qt-muted">Customer</div><h3>${esc(q.customerName)}</h3><p>${esc(q.person)} - ${esc(q.designation)}</p></div></div></section>
    <section style="background:white;border:1px solid #d0e3f1;border-radius:18px;padding:22px;margin-top:18px"><table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Unit Rate</th><th>Qty</th><th>GST Amt</th><th>Rate + GST</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table><table class="qt-total" style="margin-top:14px"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Total</strong></td><td>${money(q.grandTotal)}</td></tr></table></section><div class="qt-sign">AUTHORIZED SIGNATORY</div>
  </div>`;

const renderCompact = (q) => `
  <style>${templateCss}</style>
  <div class="qt-page" style="padding:28px 42px">
    <div style="background:#111827;color:white;padding:18px 22px;display:flex;justify-content:space-between"><div><div class="qt-company" style="font-size:20px">${esc(q.companyName)}</div><div class="qt-muted" style="color:#cbd5e1">${esc(q.address)}</div></div><div style="text-align:right"><strong>${esc(q.quotationNo)}</strong><br>${esc(q.quotationDate)}</div></div>
    <div style="display:flex;justify-content:space-between;margin:18px 0;font-size:12px"><div><strong>Subject:</strong> ${esc(q.subject)}</div><div><strong>Attention:</strong> ${esc(q.person)} - ${esc(q.designation)}</div></div>
    <table class="qt-table"><thead><tr><th>#</th><th>Description</th><th>Rate</th><th>Qty</th><th>GST</th><th>Incl.</th><th>Total</th></tr></thead><tbody>${tableRows(q.items)}</tbody></table>
    <table class="qt-total" style="margin-top:10px"><tr><td>Sub-Total</td><td>${money(q.subTotal)}</td></tr><tr><td>GST</td><td>${money(q.gstTotal)}</td></tr><tr><td><strong>Grand Total</strong></td><td>${money(q.grandTotal)}</td></tr></table><div class="qt-terms">Quoted prices are valid for 30 days. Installation/cabling scope must be confirmed before execution. Warranty as per manufacturer policy.</div><div class="qt-sign">AUTHORIZED SIGNATORY</div>
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

import nodemailer from "nodemailer";

const isEmailConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export const sendQuotationEmail = async ({ to, quotation, pdfPath }) => {
  if (!to) {
    return { sent: false, skipped: true, reason: "Customer email is empty" };
  }

  if (!isEmailConfigured()) {
    return { sent: false, skipped: true, reason: "SMTP is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Quotation ${quotation.quotationNo}`,
    text: `Dear ${quotation.customerName || "Customer"},\n\nPlease find attached quotation ${quotation.quotationNo}.\n\nRegards`,
    attachments: [
      {
        filename: `${quotation.quotationNo}.pdf`.replace(/[^\w.-]/g, "-"),
        path: pdfPath,
      },
    ],
  });

  return { sent: true, to };
};

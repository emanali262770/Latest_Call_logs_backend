import { generateQuotationPdf } from "./quotationPdf.service.js";
import { sendQuotationEmail } from "./email.service.js";

export const sendQuotationDelivery = async ({ quotation, sendEmail, sendWhatsapp }) => {
  const delivery = {
    email: { sent: false, skipped: true, reason: "Not requested" },
    whatsapp: sendWhatsapp
      ? { sent: false, skipped: true, reason: "WhatsApp delivery is disabled" }
      : { sent: false, skipped: true, reason: "Not requested" },
    pdf: null,
  };

  if (!sendEmail) {
    return delivery;
  }

  const pdf = await generateQuotationPdf(quotation);
  delivery.pdf = {
    fileName: pdf.fileName,
    url: pdf.publicUrl,
  };

  if (sendEmail) {
    try {
      delivery.email = await sendQuotationEmail({
        to: quotation.customerEmail,
        quotation,
        pdfPath: pdf.filePath,
      });
    } catch (error) {
      delivery.email = { sent: false, error: error.message };
    }
  }

  return delivery;
};

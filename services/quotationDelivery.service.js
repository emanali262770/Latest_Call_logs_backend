import { generateQuotationPdf } from "./quotationPdf.service.js";
import { sendQuotationEmail } from "./email.service.js";
import { sendQuotationWhatsapp } from "./whatsapp.service.js";

export const sendQuotationDelivery = async ({ quotation, sendEmail, sendWhatsapp }) => {
  const delivery = {
    email: { sent: false, skipped: true, reason: "Not requested" },
    whatsapp: sendWhatsapp
      ? { sent: false, skipped: true, reason: "Pending delivery" }
      : { sent: false, skipped: true, reason: "Not requested" },
    pdf: null,
  };

  if (!sendEmail && !sendWhatsapp) {
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

  if (sendWhatsapp) {
    try {
      delivery.whatsapp = await sendQuotationWhatsapp({
        to: quotation.customerWhatsappNo,
        quotation,
        pdfUrl: pdf.publicUrl,
      });
    } catch (error) {
      delivery.whatsapp = { sent: false, error: error.message };
    }
  }

  return delivery;
};

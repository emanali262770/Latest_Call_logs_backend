import { generateEstimationPdf } from "./estimationPdf.service.js";
import { sendEstimationEmail } from "./email.service.js";
import { sendEstimationWhatsapp } from "./whatsapp.service.js";

export const sendEstimationDelivery = async ({ estimation, sendEmail, sendWhatsapp }) => {
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

  const pdf = await generateEstimationPdf(estimation);
  delivery.pdf = {
    fileName: pdf.fileName,
    url: pdf.publicUrl,
  };

  if (sendEmail) {
    try {
      delivery.email = await sendEstimationEmail({
        to: estimation.customerEmail,
        estimation,
        pdfPath: pdf.filePath,
      });
    } catch (error) {
      delivery.email = { sent: false, error: error.message };
    }
  }

  if (sendWhatsapp) {
    try {
      delivery.whatsapp = await sendEstimationWhatsapp({
        to: estimation.customerWhatsappNo,
        estimation,
        pdfUrl: pdf.publicUrl,
      });
    } catch (error) {
      delivery.whatsapp = { sent: false, error: error.message };
    }
  }

  return delivery;
};

import twilio from "twilio";

const isWhatsappConfigured = () =>
  Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM &&
      process.env.PUBLIC_BASE_URL
  );

const normalizeWhatsappNumber = (number) => {
  if (!number) return null;
  const cleaned = String(number).replace(/[^\d+]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `+92${cleaned.slice(1)}`;
  }

  return `+${cleaned}`;
};

export const sendQuotationWhatsapp = async ({ to, quotation, pdfUrl }) => {
  const normalizedTo = normalizeWhatsappNumber(to);

  if (!normalizedTo) {
    return { sent: false, skipped: true, reason: "Customer WhatsApp number is empty" };
  }

  if (!isWhatsappConfigured()) {
    return { sent: false, skipped: true, reason: "Twilio WhatsApp is not configured" };
  }

  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const mediaUrl = new URL(pdfUrl, process.env.PUBLIC_BASE_URL).toString();

  const message = await client.messages.create({
    from: process.env.TWILIO_WHATSAPP_FROM,
    to: `whatsapp:${normalizedTo}`,
    body: `Quotation ${quotation.quotationNo} is attached.`,
    mediaUrl: [mediaUrl],
  });

  return { sent: true, to: normalizedTo, sid: message.sid };
};

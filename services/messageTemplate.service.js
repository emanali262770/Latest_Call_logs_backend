export const COMPANY_NAME = "Infinity Byte Solution";

export const messageTemplates = [
  {
    id: "eid_mubarak",
    event: "Eid",
    title: "Eid Mubarak",
    description: "Warm Eid greeting for customers and partners.",
    messageText:
      "Dear {{customer}}, may this Eid bring happiness, success, and peace to you and your family.\n\nThank you for trusting {{companyName}}.",
  },
  {
    id: "eid_ul_azha",
    event: "Eid",
    title: "Eid ul Azha Mubarak",
    description: "Greeting for Eid ul Azha customers.",
    messageText:
      "Dear {{customer}}, Eid ul Azha Mubarak from {{companyName}}.\n\nMay this blessed occasion bring peace, prosperity, and countless blessings to your home and business.",
  },
  {
    id: "ramadan_mubarak",
    event: "Ramadan",
    title: "Ramadan Mubarak",
    description: "Ramadan greeting for business contacts.",
    messageText:
      "Dear {{customer}}, Ramadan Mubarak.\n\nMay this holy month bring barakah, peace, and success for you. Best wishes from {{companyName}}.",
  },
  {
    id: "pakistan_day",
    event: "National",
    title: "Pakistan Day",
    description: "23 March Pakistan Day greeting.",
    messageText:
      "Dear {{customer}}, happy Pakistan Day.\n\nLet us celebrate unity, faith, and discipline with renewed commitment. Regards, {{companyName}}.",
  },
  {
    id: "independence_day",
    event: "National",
    title: "Independence Day",
    description: "14 August Independence Day greeting.",
    messageText:
      "Dear {{customer}}, happy Independence Day.\n\nMay Pakistan continue to grow with peace, progress, and prosperity. Best wishes from {{companyName}}.",
  },
  {
    id: "iqbal_day",
    event: "National",
    title: "Iqbal Day",
    description: "Iqbal Day message for customers.",
    messageText:
      "Dear {{customer}}, on Iqbal Day, we remember the vision, courage, and ideas that inspire Pakistan.\n\nRegards, {{companyName}}.",
  },
  {
    id: "quaid_day",
    event: "National",
    title: "Quaid-e-Azam Day",
    description: "Quaid-e-Azam Day greeting.",
    messageText:
      "Dear {{customer}}, remembering Quaid-e-Azam Muhammad Ali Jinnah with respect and gratitude.\n\nBest wishes from {{companyName}}.",
  },
  {
    id: "new_year",
    event: "Seasonal",
    title: "New Year",
    description: "New year wishes for customers.",
    messageText:
      "Dear {{customer}}, happy New Year.\n\nThank you for being connected with {{companyName}}. Wishing you a successful and prosperous year ahead.",
  },
  {
    id: "jumuah_mubarak",
    event: "Weekly",
    title: "Jumuah Mubarak",
    description: "Simple Friday greeting.",
    messageText:
      "Dear {{customer}}, Jumuah Mubarak.\n\nMay Allah bless your day with peace, health, and success. Regards, {{companyName}}.",
  },
  {
    id: "service_reminder",
    event: "Support",
    title: "Service Reminder",
    description: "Reminder message for service or maintenance follow-up.",
    messageText:
      "Dear {{customer}}, this is a friendly service reminder from {{companyName}}.\n\nPlease contact us if you need support, maintenance, or any technical assistance.",
  },
  {
    id: "payment_reminder",
    event: "Accounts",
    title: "Payment Reminder",
    description: "Polite payment follow-up message.",
    messageText:
      "Dear {{customer}}, this is a gentle payment reminder from {{companyName}}.\n\nPlease review your pending payment at your convenience. Thank you.",
  },
  {
    id: "new_offer",
    event: "Marketing",
    title: "New Offer",
    description: "Product or promotion announcement for selected customers.",
    messageText:
      "Dear {{customer}}, {{companyName}} has a new offer available for selected customers.\n\nContact us for details and the best possible quotation.",
  },
];

export const getMessageTemplateById = (id) =>
  messageTemplates.find((template) => template.id === id);

export const renderMessageTemplate = (messageText, customer, groupName = "") => {
  const replacements = {
    customer: customer?.person || customer?.company || "Customer",
    company: customer?.company || "",
    group: groupName || customer?.groupName || customer?.customerGroup || "",
    companyName: COMPANY_NAME,
  };

  return String(messageText || "").replace(/\{\{\s*(customer|company|group|companyName)\s*\}\}/g, (_, key) => {
    return replacements[key] || "";
  });
};

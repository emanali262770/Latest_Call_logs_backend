import { getCustomerGroupByIdModel, getCustomerGroupsModel } from "../model/customerGroup.model.js";
import { randomUUID } from "crypto";
import {
  createMessageLogModel,
  getActiveCustomersByGroupModel,
  getActiveCustomersByIdsAndGroupModel,
  getMessageLogsModel,
} from "../model/message.model.js";
import {
  COMPANY_NAME,
  getMessageTemplateById,
  messageTemplates,
  renderMessageTemplate,
} from "../services/messageTemplate.service.js";
import { sendTextWhatsapp } from "../services/whatsapp.service.js";
import { successResponse, errorResponse } from "../utils/apiResponse.js";

const toPositiveInteger = (value) => {
  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

const uniquePositiveIntegers = (values) => {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(toPositiveInteger).filter(Boolean))];
};

const getTemplatePayload = (body) => {
  const template = getMessageTemplateById(body.templateId ?? body.template_id);
  const content = body.content || {};

  return {
    id: template?.id || String(body.templateId ?? body.template_id ?? "custom").trim(),
    title: String(content.title ?? body.title ?? template?.title ?? "").trim(),
    description: String(content.description ?? body.description ?? template?.description ?? "").trim(),
    messageText: String(
      content.messageText ??
        content.message_text ??
        body.messageText ??
        body.message_text ??
        template?.messageText ??
        ""
    ).trim(),
  };
};

const buildGroupedMessageHistory = (messageLogs) => {
  const groupedMessages = new Map();

  for (const log of messageLogs) {
    const groupKey = log.batchId || `legacy-${log.id}`;
    const existingGroup = groupedMessages.get(groupKey);

    if (!existingGroup) {
      groupedMessages.set(groupKey, {
        id: log.batchId || log.id,
        batchId: log.batchId || null,
        customerGroupId: log.customerGroupId,
        groupName: log.groupName,
        templateId: log.templateId,
        templateTitle: log.templateTitle,
        messageText: log.messageText,
        status: log.status,
        sentAt: log.sentAt,
        createdAt: log.createdAt,
        totalCustomers: 0,
        sentCount: 0,
        failedCount: 0,
        customerIds: [],
        customerNames: [],
        customers: [],
        providerSids: [],
        errorMessages: [],
        isPersonalized: false,
      });
    }

    const messageGroup = groupedMessages.get(groupKey);

    if (messageGroup.messageText !== log.messageText) {
      messageGroup.isPersonalized = true;
    }

    messageGroup.totalCustomers += 1;
    messageGroup.customerIds.push(log.customerId);
    messageGroup.customerNames.push(log.customerName);

    if (log.status === "sent") {
      messageGroup.sentCount += 1;
    } else {
      messageGroup.failedCount += 1;
    }

    if (log.providerSid) {
      messageGroup.providerSids.push(log.providerSid);
    }

    if (log.errorMessage) {
      messageGroup.errorMessages.push(log.errorMessage);
    }

    messageGroup.customers.push({
      id: log.customerId,
      name: log.customerName,
      company: log.customerCompany,
      whatsappNo: log.whatsappNo,
      status: log.status,
      providerSid: log.providerSid,
      errorMessage: log.errorMessage,
      sentAt: log.sentAt,
      createdAt: log.createdAt,
      messageText: log.messageText,
    });
  }

  return [...groupedMessages.values()].map((messageGroup) => ({
    ...messageGroup,
    status:
      messageGroup.failedCount === 0
        ? "sent"
        : messageGroup.sentCount === 0
          ? "failed"
          : "partial",
  }));
};

export const getMessageHistory = async (req, res) => {
  try {
    const search = req.query.search?.trim() ?? "";
    const messageLogs = await getMessageLogsModel(search);
    const messages = buildGroupedMessageHistory(messageLogs);

    return successResponse(res, "Messages fetched successfully", {
      records: messages.length,
      messages,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch messages", 500, error.message);
  }
};

export const getMessageGroups = async (req, res) => {
  try {
    const groups = await getCustomerGroupsModel(req.query.search?.trim() ?? "", "active");

    return successResponse(res, "Customer groups fetched successfully", {
      records: groups.length,
      customerGroups: groups,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch customer groups", 500, error.message);
  }
};

export const getMessageGroupCustomers = async (req, res) => {
  try {
    const groupId = toPositiveInteger(req.params.groupId);
    if (!groupId) {
      return errorResponse(res, "groupId is invalid", 400);
    }

    const group = await getCustomerGroupByIdModel(groupId);
    if (!group || group.status === "inactive") {
      return errorResponse(res, "Customer group not found", 404);
    }

    const customers = await getActiveCustomersByGroupModel(groupId);

    return successResponse(res, "Customers fetched successfully", {
      group,
      records: customers.length,
      customers,
    });
  } catch (error) {
    return errorResponse(res, "Failed to fetch customers", 500, error.message);
  }
};

export const getMessageTemplates = async (req, res) => {
  return successResponse(res, "Message templates fetched successfully", {
    companyName: COMPANY_NAME,
    records: messageTemplates.length,
    templates: messageTemplates,
  });
};

export const previewMessage = async (req, res) => {
  try {
    const groupId = toPositiveInteger(req.body.groupId ?? req.body.group_id);
    const customerIds = uniquePositiveIntegers(req.body.customerIds ?? req.body.customer_ids);
    const templatePayload = getTemplatePayload(req.body);

    if (!templatePayload.title) {
      return errorResponse(res, "Template title is required", 400);
    }

    if (!templatePayload.messageText) {
      return errorResponse(res, "Message text is required", 400);
    }

    const group = groupId ? await getCustomerGroupByIdModel(groupId) : null;
    const customers = groupId
      ? customerIds.length
        ? await getActiveCustomersByIdsAndGroupModel(groupId, customerIds)
        : await getActiveCustomersByGroupModel(groupId)
      : [];

    const previewCustomer = customerIds.length
      ? customerIds
          .map((customerId) => customers.find((customer) => customer.id === customerId))
          .find(Boolean)
      : customers[0];

    const fallbackCustomer = {
      person: "Customer Name",
      company: "Customer Company",
      groupName: group?.groupName || group?.group_name || "",
    };

    return successResponse(res, "Message preview generated successfully", {
      template: templatePayload,
      previewText: renderMessageTemplate(
        templatePayload.messageText,
        previewCustomer || fallbackCustomer,
        group?.groupName || group?.group_name
      ),
    });
  } catch (error) {
    return errorResponse(res, "Failed to generate message preview", 500, error.message);
  }
};

export const sendMessage = async (req, res) => {
  try {
    const groupId = toPositiveInteger(req.body.groupId ?? req.body.group_id);
    const customerIds = uniquePositiveIntegers(req.body.customerIds ?? req.body.customer_ids);
    const templatePayload = getTemplatePayload(req.body);

    if (!groupId) {
      return errorResponse(res, "groupId is required", 400);
    }

    if (!customerIds.length) {
      return errorResponse(res, "customerIds is required", 400);
    }

    if (!templatePayload.title) {
      return errorResponse(res, "Template title is required", 400);
    }

    if (!templatePayload.messageText) {
      return errorResponse(res, "Message text is required", 400);
    }

    const group = await getCustomerGroupByIdModel(groupId);
    if (!group || group.status === "inactive") {
      return errorResponse(res, "Customer group not found", 404);
    }

    const customers = await getActiveCustomersByIdsAndGroupModel(groupId, customerIds);
    if (!customers.length) {
      return errorResponse(res, "No active customers found in selected group", 404);
    }

    const groupName = group.groupName || group.group_name;
    const batchId = randomUUID();
    const results = [];

    for (const customer of customers) {
      const messageText = renderMessageTemplate(templatePayload.messageText, customer, groupName);
      let sendResult;

      try {
        sendResult = await sendTextWhatsapp({
          to: customer.whatsappNo ?? customer.whatsapp_no,
          body: messageText,
        });
      } catch (error) {
        sendResult = { sent: false, skipped: false, reason: error.message };
      }

      const status = sendResult.sent ? "sent" : "failed";
      await createMessageLogModel({
        batch_id: batchId,
        customer_group_id: groupId,
        customer_id: customer.id,
        template_id: templatePayload.id,
        template_title: templatePayload.title,
        message_text: messageText,
        status,
        provider_sid: sendResult.sid || null,
        error_message: sendResult.reason || null,
      });

      results.push({
        customerId: customer.id,
        customerName: customer.person,
        whatsappNo: customer.whatsappNo ?? customer.whatsapp_no,
        status,
        sent: Boolean(sendResult.sent),
        skipped: Boolean(sendResult.skipped),
        reason: sendResult.reason || null,
        sid: sendResult.sid || null,
      });
    }

    const sentCount = results.filter((result) => result.sent).length;

    return successResponse(res, "Message sending completed", {
      batchId,
      group,
      template: templatePayload,
      requestedCustomers: customerIds.length,
      processedCustomers: results.length,
      sent: sentCount,
      failed: results.length - sentCount,
      results,
    });
  } catch (error) {
    return errorResponse(res, "Failed to send message", 500, error.message);
  }
};

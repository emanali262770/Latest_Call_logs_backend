import { db } from "../config/db.js";

let messageLogsSchemaPromise;

const ensureMessageLogsSchemaModel = async () => {
  if (!messageLogsSchemaPromise) {
    messageLogsSchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS message_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          batch_id VARCHAR(64) NULL,
          customer_group_id INT NULL,
          customer_id INT NULL,
          template_id VARCHAR(100) NOT NULL,
          template_title VARCHAR(150) NOT NULL,
          message_text TEXT NOT NULL,
          status ENUM('sent', 'failed') NOT NULL DEFAULT 'sent',
          provider_sid VARCHAR(120) NULL,
          error_message TEXT NULL,
          sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_message_logs_batch_id (batch_id),
          INDEX idx_message_logs_customer_group_id (customer_group_id),
          INDEX idx_message_logs_customer_id (customer_id),
          INDEX idx_message_logs_template_id (template_id),
          INDEX idx_message_logs_sent_at (sent_at),
          CONSTRAINT fk_message_logs_customer_group
            FOREIGN KEY (customer_group_id) REFERENCES customer_groups(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL,
          CONSTRAINT fk_message_logs_customer
            FOREIGN KEY (customer_id) REFERENCES customers(id)
            ON UPDATE CASCADE
            ON DELETE SET NULL
        )
      `);

      const [batchIdColumnRows] = await db.execute(`
        SHOW COLUMNS FROM message_logs LIKE 'batch_id'
      `);

      if (!batchIdColumnRows.length) {
        await db.execute(`
          ALTER TABLE message_logs
          ADD COLUMN batch_id VARCHAR(64) NULL AFTER id,
          ADD INDEX idx_message_logs_batch_id (batch_id)
        `);
      }
    })().catch((error) => {
      messageLogsSchemaPromise = null;
      throw error;
    });
  }

  await messageLogsSchemaPromise;
};

const messageLogSelectClause = `
  SELECT
    ml.id,
    ml.batch_id AS batchId,
    ml.customer_group_id AS customerGroupId,
    cg.group_name AS groupName,
    ml.customer_id AS customerId,
    c.person AS customerName,
    c.company AS customerCompany,
    c.whatsapp_no AS whatsappNo,
    ml.template_id AS templateId,
    ml.template_title AS templateTitle,
    ml.message_text AS messageText,
    ml.status,
    ml.provider_sid AS providerSid,
    ml.error_message AS errorMessage,
    ml.sent_at AS sentAt,
    ml.created_at AS createdAt
  FROM message_logs ml
  LEFT JOIN customer_groups cg ON ml.customer_group_id = cg.id
  LEFT JOIN customers c ON ml.customer_id = c.id
`;

export const getMessageLogsModel = async (search = "") => {
  await ensureMessageLogsSchemaModel();

  const params = [];
  const conditions = [];

  if (search) {
    conditions.push(`
      (
        COALESCE(cg.group_name, '') LIKE ?
        OR COALESCE(c.person, '') LIKE ?
        OR COALESCE(c.company, '') LIKE ?
        OR COALESCE(ml.template_title, '') LIKE ?
        OR COALESCE(ml.status, '') LIKE ?
      )
    `);
    const searchValue = `%${search}%`;
    params.push(searchValue, searchValue, searchValue, searchValue, searchValue);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.execute(
    `
    ${messageLogSelectClause}
    ${whereClause}
    ORDER BY ml.id DESC
    `,
    params
  );

  return rows;
};

export const getActiveCustomersByGroupModel = async (groupId) => {
  const [rows] = await db.execute(
    `
    SELECT
      c.id,
      c.customer_group_id AS customerGroupId,
      c.customer_group_id,
      cg.group_name AS groupName,
      c.company,
      c.person,
      c.mobile,
      c.whatsapp_no AS whatsappNo,
      c.whatsapp_no,
      c.status
    FROM customers c
    LEFT JOIN customer_groups cg ON c.customer_group_id = cg.id
    WHERE c.customer_group_id = ?
      AND c.status = 'active'
    ORDER BY c.person ASC
    `,
    [groupId]
  );

  return rows;
};

export const getActiveCustomersByIdsAndGroupModel = async (groupId, customerIds) => {
  if (!customerIds.length) return [];

  const placeholders = customerIds.map(() => "?").join(", ");
  const [rows] = await db.execute(
    `
    SELECT
      c.id,
      c.customer_group_id AS customerGroupId,
      c.customer_group_id,
      cg.group_name AS groupName,
      c.company,
      c.person,
      c.mobile,
      c.whatsapp_no AS whatsappNo,
      c.whatsapp_no,
      c.status
    FROM customers c
    LEFT JOIN customer_groups cg ON c.customer_group_id = cg.id
    WHERE c.customer_group_id = ?
      AND c.status = 'active'
      AND c.id IN (${placeholders})
    ORDER BY c.person ASC
    `,
    [groupId, ...customerIds]
  );

  return rows;
};

export const createMessageLogModel = async ({
  batch_id,
  customer_group_id,
  customer_id,
  template_id,
  template_title,
  message_text,
  status,
  provider_sid,
  error_message,
}) => {
  await ensureMessageLogsSchemaModel();

  const [result] = await db.execute(
    `
    INSERT INTO message_logs (
      batch_id,
      customer_group_id,
      customer_id,
      template_id,
      template_title,
      message_text,
      status,
      provider_sid,
      error_message,
      sent_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      batch_id,
      customer_group_id,
      customer_id,
      template_id,
      template_title,
      message_text,
      status,
      provider_sid,
      error_message,
    ]
  );

  return result;
};

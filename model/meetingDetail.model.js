import { db } from "../config/db.js";

let meetingDetailSchemaPromise;

const ensureMeetingDetailSchemaModel = async () => {
  if (!meetingDetailSchemaPromise) {
    meetingDetailSchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS meeting_details (
          id                   INT AUTO_INCREMENT PRIMARY KEY,
          customer_id          INT NOT NULL,
          service_id           INT NULL,
          status               ENUM('follow_up_required','not_interested','already_installed','phone_not_responding')
                                 NOT NULL DEFAULT 'follow_up_required',
          next_followup_date   DATE NULL,
          next_followup_time   TIME NULL,
          next_visit_details   TEXT NULL,
          action               ENUM('send_profile','send_quotation','product_information','require_visit_meeting') NULL,
          reference_provided_by VARCHAR(255) NULL,
          refer_to_staff_id    INT NULL,
          contact_method       ENUM('by_visit','by_phone','by_email') NULL,
          remarks              TEXT NULL,
          created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_md_customer
            FOREIGN KEY (customer_id) REFERENCES customers(id)
            ON UPDATE CASCADE ON DELETE CASCADE,
          CONSTRAINT fk_md_service
            FOREIGN KEY (service_id) REFERENCES services(id)
            ON UPDATE CASCADE ON DELETE SET NULL,
          CONSTRAINT fk_md_staff
            FOREIGN KEY (refer_to_staff_id) REFERENCES employees(id)
            ON UPDATE CASCADE ON DELETE SET NULL
        )
      `);

      // Backfill: create a meeting_detail row for every existing customer that doesn't have one yet
      await db.execute(`
        INSERT INTO meeting_details (customer_id, status)
        SELECT c.id, 'follow_up_required'
        FROM customers c
        LEFT JOIN meeting_details md ON md.customer_id = c.id
        WHERE md.id IS NULL
      `);
    })().catch((err) => {
      meetingDetailSchemaPromise = null;
      throw err;
    });
  }
  await meetingDetailSchemaPromise;
};

const meetingDetailSelectClause = `
  SELECT
    md.id,
    md.customer_id          AS customerId,
    c.company               AS customerName,
    c.person                AS person,
    c.designation           AS designation,
    md.service_id           AS serviceId,
    s.service_name          AS forProduct,
    md.status,
    md.next_followup_date   AS nextFollowupDate,
    md.next_followup_time   AS nextFollowupTime,
    md.next_visit_details   AS nextVisitDetails,
    md.action,
    md.reference_provided_by AS referenceProvidedBy,
    md.refer_to_staff_id    AS referToStaffId,
    COALESCE(e.employee_name, e.first_name) AS referToStaffName,
    md.contact_method       AS contactMethod,
    md.remarks,
    md.created_at           AS createdAt,
    md.updated_at           AS updatedAt
  FROM meeting_details md
  LEFT JOIN customers c    ON md.customer_id       = c.id
  LEFT JOIN services  s    ON md.service_id        = s.id
  LEFT JOIN employees e    ON md.refer_to_staff_id = e.id
`;

export const createMeetingDetailModel = async ({ customer_id }) => {
  await ensureMeetingDetailSchemaModel();
  const [result] = await db.execute(
    `INSERT INTO meeting_details (customer_id, status) VALUES (?, 'follow_up_required')`,
    [customer_id]
  );
  return result;
};

export const getMeetingDetailsModel = async (search = "") => {
  await ensureMeetingDetailSchemaModel();

  const params = [];
  let whereClause = "";

  if (search) {
    whereClause = `
      WHERE (
        COALESCE(c.company, '') LIKE ?
        OR COALESCE(c.person, '')  LIKE ?
        OR COALESCE(s.service_name, '') LIKE ?
        OR COALESCE(md.status, '')  LIKE ?
      )
    `;
    const v = `%${search}%`;
    params.push(v, v, v, v);
  }

  const [rows] = await db.execute(
    `${meetingDetailSelectClause} ${whereClause} ORDER BY md.id DESC`,
    params
  );
  return rows;
};

export const getMeetingDetailByIdModel = async (id) => {
  await ensureMeetingDetailSchemaModel();
  const [rows] = await db.execute(
    `${meetingDetailSelectClause} WHERE md.id = ?`,
    [id]
  );
  return rows[0];
};

export const updateMeetingDetailModel = async ({
  id,
  service_id,
  status,
  next_followup_date,
  next_followup_time,
  next_visit_details,
  action,
  reference_provided_by,
  refer_to_staff_id,
  contact_method,
  remarks,
}) => {
  await ensureMeetingDetailSchemaModel();
  const [result] = await db.execute(
    `
    UPDATE meeting_details SET
      service_id            = ?,
      status                = ?,
      next_followup_date    = ?,
      next_followup_time    = ?,
      next_visit_details    = ?,
      action                = ?,
      reference_provided_by = ?,
      refer_to_staff_id     = ?,
      contact_method        = ?,
      remarks               = ?
    WHERE id = ?
    `,
    [
      service_id,
      status,
      next_followup_date,
      next_followup_time,
      next_visit_details,
      action,
      reference_provided_by,
      refer_to_staff_id,
      contact_method,
      remarks,
      id,
    ]
  );
  return result;
};

export const deleteMeetingDetailModel = async (id) => {
  await ensureMeetingDetailSchemaModel();
  const [result] = await db.execute(`DELETE FROM meeting_details WHERE id = ?`, [id]);
  return result;
};

import { db } from "../config/db.js";

let followUpSchemaPromise;

const ensureFollowUpSchema = async () => {
  if (!followUpSchemaPromise) {
    followUpSchemaPromise = (async () => {
      await db.execute(`
        CREATE TABLE IF NOT EXISTS follow_ups (
          id                   INT AUTO_INCREMENT PRIMARY KEY,
          meeting_detail_id    INT NOT NULL,
          followup_date        DATE NULL,
          followup_time        TIME NULL,
          next_followup_date   DATE NULL,
          next_followup_time   TIME NULL,
          customer_remarks     TEXT NULL,
          status               ENUM('active','hold','complete') NOT NULL DEFAULT 'active',
          created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          CONSTRAINT fk_fu_meeting_detail
            FOREIGN KEY (meeting_detail_id) REFERENCES meeting_details(id)
            ON UPDATE CASCADE ON DELETE CASCADE
        )
      `);

      // Auto-create follow_up row for every meeting_detail with follow_up_required status that doesn't have one
      await db.execute(`
        INSERT INTO follow_ups (meeting_detail_id, followup_date, followup_time)
        SELECT md.id, md.next_followup_date, md.next_followup_time
        FROM meeting_details md
        LEFT JOIN follow_ups fu ON fu.meeting_detail_id = md.id
        WHERE md.status = 'follow_up_required'
          AND fu.id IS NULL
      `);
    })().catch((err) => {
      followUpSchemaPromise = null;
      throw err;
    });
  }
  await followUpSchemaPromise;
};

const followUpSelectClause = `
  SELECT
    fu.id,
    fu.meeting_detail_id    AS meetingDetailId,
    md.customer_id          AS customerId,
    c.company               AS companyName,
    c.whatsapp_no           AS customerNumber,
    fu.followup_date        AS followupDate,
    fu.followup_time        AS followupTime,
    fu.next_followup_date   AS nextFollowupDate,
    fu.next_followup_time   AS nextFollowupTime,
    fu.customer_remarks     AS customerRemarks,
    fu.status,
    fu.created_at           AS createdAt,
    fu.updated_at           AS updatedAt
  FROM follow_ups fu
  JOIN meeting_details md ON fu.meeting_detail_id = md.id
  LEFT JOIN customers c   ON md.customer_id = c.id
`;

export const getFollowUpsModel = async (search = "") => {
  await ensureFollowUpSchema();

  const params = [];
  let whereClause = "WHERE md.status = 'follow_up_required'";

  if (search) {
    whereClause += ` AND (
      COALESCE(c.company, '') LIKE ?
      OR COALESCE(c.whatsapp_no, '') LIKE ?
      OR COALESCE(fu.customer_remarks, '') LIKE ?
      OR COALESCE(fu.status, '') LIKE ?
    )`;
    const v = `%${search}%`;
    params.push(v, v, v, v);
  }

  const [rows] = await db.execute(
    `${followUpSelectClause} ${whereClause} ORDER BY fu.id DESC`,
    params
  );
  return rows;
};

export const getFollowUpByIdModel = async (id) => {
  await ensureFollowUpSchema();
  const [rows] = await db.execute(
    `${followUpSelectClause} WHERE fu.id = ?`,
    [id]
  );
  return rows[0];
};

export const updateFollowUpModel = async ({
  id,
  next_followup_date,
  next_followup_time,
  customer_remarks,
  status,
}) => {
  await ensureFollowUpSchema();
  const [result] = await db.execute(
    `UPDATE follow_ups SET
       next_followup_date = ?,
       next_followup_time = ?,
       customer_remarks   = ?,
       status             = ?
     WHERE id = ?`,
    [next_followup_date, next_followup_time, customer_remarks, status, id]
  );
  return result;
};

export const deleteFollowUpModel = async (id) => {
  await ensureFollowUpSchema();
  const [result] = await db.execute(`DELETE FROM follow_ups WHERE id = ?`, [id]);
  return result;
};

// Called from meetingDetail controller when status becomes follow_up_required
export const ensureFollowUpForMeetingDetail = async (meetingDetailId, followupDate, followupTime) => {
  await ensureFollowUpSchema();
  const [existing] = await db.execute(
    `SELECT id FROM follow_ups WHERE meeting_detail_id = ?`,
    [meetingDetailId]
  );
  if (existing.length === 0) {
    await db.execute(
      `INSERT INTO follow_ups (meeting_detail_id, followup_date, followup_time) VALUES (?, ?, ?)`,
      [meetingDetailId, followupDate ?? null, followupTime ?? null]
    );
  }
};

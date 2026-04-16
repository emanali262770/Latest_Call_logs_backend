import { db } from "../config/db.js";

const customerGroupSelectClause = `
  SELECT
    id,
    group_name AS groupName,
    group_name,
    status,
    created_at AS createdAt,
    created_at,
    updated_at AS updatedAt,
    updated_at
  FROM customer_groups
`;

export const createCustomerGroupModel = async ({ group_name, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO customer_groups (
      group_name,
      status
    )
    VALUES (?, ?)
    `,
    [group_name.trim(), status || "active"]
  );

  return result;
};

export const getCustomerGroupsModel = async (search = "", status) => {
  const conditions = [];
  const params = [];

  if (search) {
    conditions.push("(group_name LIKE ?)");
    params.push(`%${search}%`);
  }

  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const [rows] = await db.execute(
    `
    ${customerGroupSelectClause}
    ${whereClause}
    ORDER BY id DESC
    `,
    params
  );

  return rows;
};

export const getCustomerGroupByIdModel = async (id) => {
  const [rows] = await db.execute(
    `
    ${customerGroupSelectClause}
    WHERE id = ?
    `,
    [id]
  );

  return rows[0];
};

export const getCustomerGroupByNameModel = async (groupName) => {
  const [rows] = await db.execute(
    `
    SELECT id, group_name, status
    FROM customer_groups
    WHERE LOWER(TRIM(group_name)) = LOWER(TRIM(?))
    LIMIT 1
    `,
    [groupName]
  );

  return rows[0];
};

export const updateCustomerGroupModel = async ({ id, group_name, status }) => {
  const [result] = await db.execute(
    `
    UPDATE customer_groups
    SET
      group_name = ?,
      status = ?
    WHERE id = ?
    `,
    [group_name.trim(), status, id]
  );

  return result;
};

export const deleteCustomerGroupModel = async (id) => {
  const [result] = await db.execute(
    `DELETE FROM customer_groups WHERE id = ?`,
    [id]
  );

  return result;
};

import { db } from "../config/db.js";

export const createGroupModel = async ({ group_name, description, status }) => {
  const [result] = await db.execute(
    `
    INSERT INTO software_groups (group_name, description, status)
    VALUES (?, ?, ?)
    `,
    [group_name, description, status || "active"]
  );

  return result;
};

export const getGroupsModel = async () => {
  const [rows] = await db.execute(`SELECT * FROM software_groups ORDER BY id DESC`);
  return rows;
};
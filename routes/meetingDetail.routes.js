import express from "express";
import {
  getMeetingDetails,
  getMeetingDetailById,
  updateMeetingDetail,
  deleteMeetingDetail,
} from "../controllers/meetingDetail.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { checkPermission } from "../middlewares/permission.middleware.js";

const router = express.Router();

router.get(
  "/",
  protect,
  checkPermission("MEETINGS.MEETING_DETAIL.READ"),
  getMeetingDetails
);

router.get(
  "/:id",
  protect,
  checkPermission("MEETINGS.MEETING_DETAIL.READ"),
  getMeetingDetailById
);

router.put(
  "/:id",
  protect,
  checkPermission("MEETINGS.MEETING_DETAIL.UPDATE"),
  updateMeetingDetail
);

router.delete(
  "/:id",
  protect,
  checkPermission("MEETINGS.MEETING_DETAIL.DELETE"),
  deleteMeetingDetail
);

export default router;

import express from "express";
import { login, me, checkToken } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/check-token", checkToken);
router.get("/me", protect, me);

export default router;

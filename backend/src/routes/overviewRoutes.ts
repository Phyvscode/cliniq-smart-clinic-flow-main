import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import { getTodayOverview } from "../controllers/overviewController";

const router = Router();
router.use(protect, requireRole("admin"));

router.get("/today", getTodayOverview);

export default router;

import { Router } from "express";
import {
  getQueue, addToQueue, nextPatient,
  updateQueueStatus, removeFromQueue,
} from "../controllers/queueController";
import { protect, requireRole } from "../middleware/auth";

const router = Router();

router.use(protect);

router.get("/",              getQueue);
router.post("/",             requireRole("reception", "admin"), addToQueue);
router.post("/next",         requireRole("reception", "admin", "doctor"), nextPatient);
router.patch("/:id/status",  requireRole("reception", "admin", "doctor"), updateQueueStatus); // ← frontend uses /status
router.patch("/:id",         requireRole("reception", "admin", "doctor"), updateQueueStatus);
router.delete("/:id",        requireRole("reception", "admin"), removeFromQueue);

export default router;
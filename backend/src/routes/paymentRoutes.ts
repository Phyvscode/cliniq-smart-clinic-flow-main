import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  createPayment, getPayments,
  assignDoctorToPayment, assignDoctorByQueue,
} from "../controllers/paymentController";

const router = Router();
router.use(protect);

// Reception creates payments
router.post("/",                                     requireRole("admin", "reception"), createPayment);
router.get("/",                                      requireRole("admin"), getPayments);
router.patch("/:id/assign-doctor",                   requireRole("admin", "doctor"), assignDoctorToPayment);
router.patch("/by-queue/:queueEntryId/assign-doctor", requireRole("admin", "doctor"), assignDoctorByQueue);

export default router;
import { Router } from "express";
import {
  createLabOrder, getLabOrders, updateLabOrderStatus,
  collectLabFee, uploadLabReport,
} from "../controllers/labOrderController";
import { protect, requireRole } from "../middleware/auth";

const router = Router();

router.use(protect);

router.post("/orders",             requireRole("doctor"),                   createLabOrder);
router.get("/orders",              getLabOrders);
router.patch("/orders/:id/status", requireRole("lab_staff","doctor","admin"), updateLabOrderStatus);
router.patch("/orders/:id/fee",    requireRole("reception","admin"),         collectLabFee);
router.patch("/orders/:id/report", requireRole("lab_staff","admin"),         uploadLabReport);

export default router;

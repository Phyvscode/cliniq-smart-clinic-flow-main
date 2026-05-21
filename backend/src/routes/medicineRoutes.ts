import { Router } from "express";
import {
  getMedicines, createMedicine, updateMedicine, deleteMedicine,
} from "../controllers/medicineController";
import { protect, requireRole } from "../middleware/auth";

const router = Router();

router.use(protect);

router.get("/",       getMedicines);                         // all roles
router.post("/",      requireRole("admin"), createMedicine);
router.patch("/:id",  requireRole("admin"), updateMedicine);
router.delete("/:id", requireRole("admin"), deleteMedicine);

export default router;
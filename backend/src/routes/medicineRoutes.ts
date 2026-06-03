import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  getMedicines,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  seedMedicines,
} from "../controllers/medicineController";

const router = Router();

router.get   ("/",        protect, getMedicines);
router.post  ("/seed",    protect, requireRole("admin"), seedMedicines);
router.post  ("/",        protect, requireRole("admin"), createMedicine);
router.patch ("/:id",     protect, requireRole("admin"), updateMedicine);
router.delete("/:id",     protect, requireRole("admin"), deleteMedicine);

export default router;
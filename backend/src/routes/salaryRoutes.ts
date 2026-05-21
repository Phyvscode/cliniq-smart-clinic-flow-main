import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  getAllSalaryConfigs,
  getDoctorSalaryConfig,
  upsertSalaryConfig,
  deleteSalaryConfig,
} from "../controllers/salaryController";

const router = Router();

router.use(protect, requireRole("admin"));

router.get("/config",              getAllSalaryConfigs);
router.get("/config/:doctorId",    getDoctorSalaryConfig);
router.post("/config/:doctorId",   upsertSalaryConfig);
router.patch("/config/:doctorId",  upsertSalaryConfig);
router.delete("/config/:doctorId", deleteSalaryConfig);

export default router;
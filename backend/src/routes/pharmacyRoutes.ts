import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  getPharmacyQueue, lookupByPatientCode, lookupByRxCode,
  collectPrescription, getMedicines, addMedicine, deleteMedicine,
  createOtcSale, getOtcSales,
} from "../controllers/pharmacyController";

const router = Router();
router.use(protect, requireRole("pharmacist", "admin"));

router.get("/queue",                    getPharmacyQueue);
router.get("/lookup/:code",             lookupByPatientCode);
router.get("/lookup/rx/:rxCode",        lookupByRxCode);
router.post("/collect/:prescriptionId", collectPrescription);
router.get("/medicines",                getMedicines);
router.post("/medicines",               addMedicine);
router.delete("/medicines/:id",         deleteMedicine);

// OTC walk-in sales
router.post("/otc",                     createOtcSale);
router.get("/otc",                      getOtcSales);

export default router;
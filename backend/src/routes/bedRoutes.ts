import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import { getBeds, createBed, deleteBed, assignBed, vacateBed } from "../controllers/bedController";

const router = Router();
router.use(protect);

router.get("/",              getBeds);
router.post("/",             requireRole("admin"),               createBed);
router.delete("/:id",        requireRole("admin"),               deleteBed);
router.patch("/:id/assign",  requireRole("reception", "admin"),  assignBed);
router.patch("/:id/vacate",  requireRole("reception", "admin"),  vacateBed);

export default router;

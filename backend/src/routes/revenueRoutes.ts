import { Router } from "express";
import { protect, requireRole } from "../middleware/auth";
import {
  // Tier 1
  getRevenueStats, getDoctorRevenueStats, getTransactions, getMonthlyTrend,
  // Tier 2
  getDailyGraph, getRevenueByDepartment, getDoctorPerformance, getPaymentBreakdown,
  // Tier 3
  getWeeklyTrend, getPeakHours, getDeptGrowth, getPendingPayments, getAlerts,
  getAllStaffSalaryStats,
} from "../controllers/revenueController";

const router = Router();
router.use(protect, requireRole("admin"));

// Tier 1
router.get("/stats",           getRevenueStats);
router.get("/doctor-stats",    getDoctorRevenueStats);
router.get("/transactions",    getTransactions);
router.get("/monthly-trend",   getMonthlyTrend);

// Tier 2
router.get("/daily-graph",         getDailyGraph);
router.get("/by-department",       getRevenueByDepartment);
router.get("/doctor-performance",  getDoctorPerformance);
router.get("/payment-breakdown",   getPaymentBreakdown);

// All staff salary
router.get("/all-staff-stats", getAllStaffSalaryStats);

// Tier 3
router.get("/weekly-trend",   getWeeklyTrend);
router.get("/peak-hours",     getPeakHours);
router.get("/dept-growth",    getDeptGrowth);
router.get("/pending",        getPendingPayments);
router.get("/alerts",         getAlerts);

export default router;
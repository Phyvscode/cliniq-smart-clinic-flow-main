import { useState, useEffect, useCallback } from "react";
import { apiGetTier } from "@/lib/api";

// Mirror of backend TIER_FEATURES constant
export const TIER_FEATURES = {
  // Tier 1
  REVENUE_DASHBOARD:   "revenue_dashboard",
  PATIENT_COUNT_TODAY: "patient_count_today",
  DOCTOR_LIST:         "doctor_list",
  SALARY_MANAGEMENT:   "salary_management",
  TRANSACTION_HISTORY: "transaction_history",
  STAFF_MANAGEMENT:    "staff_management",

  // Tier 2
  ADVANCED_ANALYTICS:  "advanced_analytics",
  APPOINTMENT_BOOKING: "appointment_booking",
  LAB_REPORTS:         "lab_reports",

  // Tier 3
  MULTI_BRANCH:        "multi_branch",
  INSURANCE_CLAIMS:    "insurance_claims",
  BI_REPORTS:          "bi_reports",
} as const;

export type TierFeature = typeof TIER_FEATURES[keyof typeof TIER_FEATURES];

interface TierState {
  tier:     number;         // 0 = no tier active
  features: TierFeature[];
  loading:  boolean;
  error:    string | null;
}

export const useTier = () => {
  const [state, setState] = useState<TierState>({
    tier:     0,
    features: [],
    loading:  true,
    error:    null,
  });

  const fetchTier = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const res = await apiGetTier();
      setState({
        tier:     res.tier     ?? 0,
        features: res.features ?? [],
        loading:  false,
        error:    null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error:   err.message || "Failed to load tier",
      }));
    }
  }, []);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  // Check if a specific feature is unlocked
  const has = useCallback(
    (feature: TierFeature): boolean => state.features.includes(feature),
    [state.features],
  );

  // Check if tier level is at least N
  const atLeast = useCallback(
    (minTier: 1 | 2 | 3): boolean => state.tier >= minTier,
    [state.tier],
  );

  return {
    tier:      state.tier,
    features:  state.features,
    loading:   state.loading,
    error:     state.error,
    has,
    atLeast,
    refresh:   fetchTier,
  };
};
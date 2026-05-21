import mongoose, { Document, Schema } from "mongoose";

export type TierLevel = 1 | 2 | 3;

// All possible feature flags across tiers
export const TIER_FEATURES = {
  // Tier 1
  REVENUE_DASHBOARD:    "revenue_dashboard",     // revenue stats cards
  PATIENT_COUNT_TODAY:  "patient_count_today",   // daily patient counter
  DOCTOR_LIST:          "doctor_list",           // doctor status list
  SALARY_MANAGEMENT:    "salary_management",     // fixed/% salary config
  TRANSACTION_HISTORY:  "transaction_history",   // basic payment list
  STAFF_MANAGEMENT:     "staff_management",      // add/remove staff

  // Tier 2 (future)
  ADVANCED_ANALYTICS:   "advanced_analytics",
  APPOINTMENT_BOOKING:  "appointment_booking",
  LAB_REPORTS:          "lab_reports",

  // Tier 3 (future)
  MULTI_BRANCH:         "multi_branch",
  INSURANCE_CLAIMS:     "insurance_claims",
  BI_REPORTS:           "bi_reports",
} as const;

export const TIER_FEATURE_MAP: Record<TierLevel, string[]> = {
  1: [
    TIER_FEATURES.REVENUE_DASHBOARD,
    TIER_FEATURES.PATIENT_COUNT_TODAY,
    TIER_FEATURES.DOCTOR_LIST,
    TIER_FEATURES.SALARY_MANAGEMENT,
    TIER_FEATURES.TRANSACTION_HISTORY,
    TIER_FEATURES.STAFF_MANAGEMENT,
  ],
  2: [
    // includes all tier 1 +
    TIER_FEATURES.REVENUE_DASHBOARD,
    TIER_FEATURES.PATIENT_COUNT_TODAY,
    TIER_FEATURES.DOCTOR_LIST,
    TIER_FEATURES.SALARY_MANAGEMENT,
    TIER_FEATURES.TRANSACTION_HISTORY,
    TIER_FEATURES.STAFF_MANAGEMENT,
    TIER_FEATURES.ADVANCED_ANALYTICS,
    TIER_FEATURES.APPOINTMENT_BOOKING,
    TIER_FEATURES.LAB_REPORTS,
  ],
  3: Object.values(TIER_FEATURES),
};

export interface ITierConfig extends Document {
  tier:        TierLevel;
  enabledAt:   Date;
  enabledBy:   mongoose.Types.ObjectId;   // admin userId
  notes?:      string;
}

const TierConfigSchema = new Schema<ITierConfig>(
  {
    tier:      { type: Number, enum: [1, 2, 3], required: true },
    enabledAt: { type: Date,   default: Date.now },
    enabledBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    notes:     { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model<ITierConfig>("TierConfig", TierConfigSchema);
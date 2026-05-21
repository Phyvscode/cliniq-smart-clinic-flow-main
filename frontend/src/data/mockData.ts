// ── Types ─────────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  phone: string;
  email?: string;
  address?: string;
  pinCode?: string;
  bloodGroup?: string;
  relativeName?: string;
  relativeRelationship?: string;
  relativePhone?: string;
  govIdType?: string;
  govIdNumber?: string;
  visitType?: "OPD" | "IPD" | "Emergency";
  department?: string;
  doctorAssigned?: string;
  appointmentType?: "New" | "Follow-up";
  allergies?: string;
  chronicConditions?: string;
  currentMedications?: string;
  severity?: "Normal" | "Urgent" | "Critical";
  insuranceProvider?: string;
  policyNumber?: string;
  insuranceType?: "Cashless" | "Reimbursement";
  occupation?: string;
  maritalStatus?: string;
  referredBy?: "Doctor" | "Online" | "Walk-in" | "";
  consentGiven?: boolean;
  registeredAt?: string;
  registeredBy?: string;
}

export interface Medicine {
  id: string;
  name: string;
  type: string;
}

export interface PrescriptionMedicine {
  medicineId:    string;
  name:          string;
  // Timing slots (classic morning/afternoon/evening/night)
  morning:       boolean;
  afternoon:     boolean;
  evening:       boolean;
  night:         boolean;
  // NEW: flexible interval (e.g. "every 4 hours", "every 6 hours", "every 8 hours")
  // when set, overrides the slot toggles
  frequencyInterval?: "4h" | "6h" | "8h" | "12h" | null;
  // NEW: dosage amount and unit
  dosageAmount?: number;          // e.g. 500
  dosageUnit?:   "mg" | "ml";    // e.g. "mg"
  durationDays:  number;
  // NEW: special instructions
  instructions?: string;         // e.g. "After food", "Before sleep"
}

export interface Prescription {
  id:          string;
  patientId:   string;
  doctorName:  string;
  date:        string;
  diagnosis?:  string;           // NEW: doctor's final diagnosis
  medicines:   PrescriptionMedicine[];
  notes?:      string;
}

export interface QueueEntry {
  id:              string;
  patientId:       string;
  queueNumber:     number;
  status:          "waiting" | "in-consultation" | "done";
  addedAt:         string;
  assignedDoctor?: any;
}

// All data comes from the backend
export const MEDICINES: Medicine[] = [];
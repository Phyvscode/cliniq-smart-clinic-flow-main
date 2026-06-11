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
  medicineId: string;
  name: string;
  morning: boolean;
  afternoon: boolean;
  evening: boolean;
  night: boolean;
  durationDays: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorName: string;
  date: string;
  medicines: PrescriptionMedicine[];
  notes?: string;
}

export interface QueueEntry {
  id: string;
  patientId: string;
  queueNumber: number;
  status: "waiting" | "in-consultation" | "done";
  addedAt: string;
  department?: string;
  rxCode?: string;
  _patient?: any;  // populated patient data from backend
}

// No INITIAL_PATIENTS, no INITIAL_PRESCRIPTIONS, no hardcoded MEDICINES.
// All data comes from the backend.
export const MEDICINES: Medicine[] = []; // kept for type compat, populated at runtime
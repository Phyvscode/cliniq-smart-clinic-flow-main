import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  Patient, Prescription, QueueEntry, PrescriptionMedicine, Medicine,
} from "@/data/mockData";
import {
  apiGetPatients, apiCreatePatient, apiGetQueue, apiAddToQueue,
  apiNextPatient, apiRemoveFromQueue, apiCreatePrescription,
  apiGetPatientPrescriptions, apiGetMedicines, apiUpdateQueueStatus,
} from "@/lib/api";

interface ClinicContextType {
  // Data
  patients: Patient[];
  prescriptions: Prescription[];
  queue: QueueEntry[];
  medicines: Medicine[];
  currentQueueIndex: number;
  loading: boolean;
  // Patient
  addPatient: (patient: Omit<Patient, "id">) => Promise<Patient>;
  findPatientByPhone: (phone: string) => Patient | undefined;
  refreshPatients: () => Promise<void>;
  // Queue
  addToQueue: (patientId: string, doctorId?: string, department?: string) => Promise<QueueEntry>;
  nextPatient: () => Promise<void>;
  removeFromQueue: (queueEntryId: string) => Promise<void>;
  refreshQueue: () => Promise<void>;
  // Medicines
  refreshMedicines: () => Promise<void>;
  // Prescription / Diagnosis
  getCurrentPatient: () => { patient: Patient; queueEntry: QueueEntry } | null;
  savePrescription: (patientId: string, medicines: PrescriptionMedicine[], notes?: string) => Promise<string>;
  getPatientPrescriptions: (patientId: string) => Promise<Prescription[]>;
}

const ClinicContext = createContext<ClinicContextType | null>(null);

export const useClinic = () => {
  const ctx = useContext(ClinicContext);
  if (!ctx) throw new Error("useClinic must be used within ClinicProvider");
  return ctx;
};

const normalise = (obj: any): any => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(normalise);
  const out: any = { ...obj };
  if (out._id && !out.id) out.id = String(out._id);
  if (out.patient && typeof out.patient === "object") out.patient = normalise(out.patient);
  if (out.medicines && Array.isArray(out.medicines)) {
    out.medicines = out.medicines.map((m: any) => ({
      ...m,
      medicineId: m.medicineId || (m.medicine?._id ? String(m.medicine._id) : m.medicine),
      name: m.medicineName || m.name,
    }));
  }
  return out;
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [patients, setPatients]           = useState<Patient[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [queue, setQueue]                 = useState<QueueEntry[]>([]);
  const [medicines, setMedicines]         = useState<Medicine[]>([]);
  const [loading, setLoading]             = useState(false);

  const refreshPatients = useCallback(async () => {
    try {
      const res = await apiGetPatients();
      setPatients(normalise(res.patients || []));
    } catch { }
  }, []);

  const refreshQueue = useCallback(async () => {
    try {
      const res = await apiGetQueue();
      const entries: QueueEntry[] = (res.queue || []).map((q: any) => ({
        id:          String(q._id || q.id),
        patientId:   q.patient?._id ? String(q.patient._id) : String(q.patient),
        queueNumber: q.queueNumber,
        status:      q.status,
        addedAt:     q.createdAt || q.addedAt || new Date().toISOString(),
        _patient:    q.patient && typeof q.patient === "object" ? normalise(q.patient) : null,
      }));
      setQueue(entries);

      const inlinePatients = entries
        .filter((e: any) => e._patient)
        .map((e: any) => ({ ...e._patient, id: e.patientId }));
      if (inlinePatients.length > 0) {
        setPatients(prev => {
          const map = new Map(prev.map(p => [p.id, p]));
          inlinePatients.forEach((p: Patient) => { if (!map.has(p.id)) map.set(p.id, p); });
          return Array.from(map.values());
        });
      }
    } catch { }
  }, []);

  // Exposed so DoctorPrescription can call it on mount to get latest medicines
  const refreshMedicines = useCallback(async () => {
    try {
      const res = await apiGetMedicines();
      setMedicines((res.medicines || []).map((m: any) => ({
        id:   String(m._id || m.id),
        name: m.name,
        type: m.type,
      })));
    } catch { }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("cliniq_token");
    if (token) {
      refreshPatients();
      refreshQueue();
      refreshMedicines();
    }
  }, []);

  const findPatientByPhone = useCallback(
    (phone: string) => patients.find(p => p.phone === phone),
    [patients],
  );

  const addPatient = useCallback(async (data: Omit<Patient, "id">) => {
    const res     = await apiCreatePatient(data);
    const patient: Patient = normalise(res.patient);
    setPatients(prev => [...prev, patient]);
    return patient;
  }, []);

  const addToQueue = useCallback(async (patientId: string, doctorId?: string, department?: string) => {
    const res   = await apiAddToQueue(patientId, doctorId, department);
    await refreshQueue();
    const entry = res.entry;
    return {
      id:          String(entry._id || entry.id),
      patientId,
      queueNumber: entry.queueNumber,
      status:      entry.status,
      addedAt:     entry.createdAt || new Date().toISOString(),
    } as QueueEntry;
  }, [refreshQueue]);

  const nextPatient = useCallback(async () => {
    await apiNextPatient();
    await refreshQueue();
  }, [refreshQueue]);

  const removeFromQueue = useCallback(async (queueEntryId: string) => {
    await apiRemoveFromQueue(queueEntryId);
    setQueue(prev => prev.filter(q => q.id !== queueEntryId));
  }, []);

  const getCurrentPatient = useCallback(() => {
    const diagnosis = sessionStorage.getItem("currentDiagnosis");
    if (!diagnosis) return null;
    const { patientId } = JSON.parse(diagnosis);
    const patient    = patients.find(p => p.id === patientId);
    const queueEntry = queue.find(q => q.patientId === patientId && q.status !== "done");
    if (!patient || !queueEntry) return null;
    return { patient, queueEntry };
  }, [patients, queue]);

  const savePrescription = useCallback(async (
    patientId: string,
    meds: PrescriptionMedicine[],
    notes?: string,
  ): Promise<string> => {
    const diagnosis  = sessionStorage.getItem("currentDiagnosis");
    const problems   = diagnosis ? JSON.parse(diagnosis).problems || [] : [];
    const queueEntry = queue.find(q => q.patientId === patientId && q.status !== "done");

    const res = await apiCreatePrescription({
      patientId,
      problems,
      medicines: meds.map(m => ({
        medicineId:   m.medicineId,
        morning:      m.morning,
        afternoon:    m.afternoon,
        evening:      m.evening,
        night:        m.night,
        durationDays: m.durationDays,
        instructions: m.instructions || "",
      })),
      notes:        notes || "",
      queueEntryId: queueEntry?.id,
    });

    sessionStorage.removeItem("currentDiagnosis");
    await refreshQueue();
    return String(res.prescription?._id || res.prescription?.id || "");
  }, [queue, refreshQueue]);

  const getPatientPrescriptions = useCallback(async (patientId: string): Promise<Prescription[]> => {
    const res = await apiGetPatientPrescriptions(patientId);
    return (res.prescriptions || []).map((rx: any) => ({
      id:         String(rx._id || rx.id),
      patientId:  rx.patient?._id ? String(rx.patient._id) : String(rx.patient),
      doctorName: rx.doctorName,
      date:       rx.date || rx.createdAt?.split("T")[0] || "",
      medicines:  (rx.medicines || []).map((m: any) => ({
        medicineId:  m.medicineId || String(m.medicine?._id || m.medicine),
        name:        m.medicineName || m.name,
        morning:     m.morning,
        afternoon:   m.afternoon,
        evening:     m.evening,
        night:       m.night,
        durationDays: m.durationDays,
      })),
      notes: rx.notes,
    }));
  }, []);

  return (
    <ClinicContext.Provider value={{
      patients, prescriptions, queue, medicines, currentQueueIndex: 0, loading,
      addPatient, findPatientByPhone, refreshPatients,
      addToQueue, nextPatient, removeFromQueue, refreshQueue,
      refreshMedicines,
      getCurrentPatient, savePrescription, getPatientPrescriptions,
    }}>
      {children}
    </ClinicContext.Provider>
  );
};
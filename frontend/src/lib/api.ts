const BASE_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:5000/api";

const getToken = () => localStorage.getItem("cliniq_token");

const logout = () => {
  localStorage.removeItem("cliniq_token");
  localStorage.removeItem("cliniq_user");
  window.location.href = "/";
};

const request = async (path: string, options: RequestInit = {}, timeoutMs = 15000) => {
  const token = getToken();

  // Abort after timeoutMs — prevents hanging when Render is waking up
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    clearTimeout(timer);
    const data = await res.json();
    // Token expired or invalid — kick back to login
    if (res.status === 401) { logout(); throw new Error("Session expired. Please log in again."); }
    if (!res.ok) throw new Error(data.message || "Something went wrong");
    return data;
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") throw new Error("Server is taking too long. Please try again.");
    throw err;
  }
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const apiSignup = (body: { name: string; email: string; password: string; role: string }) =>
  request("/auth/signup", { method: "POST", body: JSON.stringify(body) });

export const apiLogin = (body: { email: string; password: string; role: string }) =>
  request("/auth/login", { method: "POST", body: JSON.stringify(body) });

export const apiGetMe = () => request("/auth/me");

// ── Patients ──────────────────────────────────────────────────────────────────
export const apiGetPatients = (search?: string) =>
  request(`/patients${search ? `?search=${search}` : ""}`);

export const apiGetPatient = (id: string) => request(`/patients/${id}`);

export const apiCreatePatient = (body: object) =>
  request("/patients", { method: "POST", body: JSON.stringify(body) });

export const apiUpdatePatient = (id: string, body: object) =>
  request(`/patients/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const apiGetPatientPrescriptions = (id: string) =>
  request(`/patients/${id}/prescriptions`);

// ── Queue ─────────────────────────────────────────────────────────────────────
export const apiGetQueue = () => request("/queue");

export const apiAddToQueue = (patientId: string, doctorId?: string, department?: string) =>
  request("/queue", { method: "POST", body: JSON.stringify({ patientId, doctorId, department }) });

export const apiNextPatient = () =>
  request("/queue/next", { method: "POST" });

export const apiUpdateQueueStatus = (id: string, status: string) =>
  request(`/queue/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });

export const apiRemoveFromQueue = (id: string) =>
  request(`/queue/${id}`, { method: "DELETE" });

export const apiGetQueueStats = () => request("/queue/stats");

// ── Prescriptions ─────────────────────────────────────────────────────────────
export const apiCreatePrescription = (body: object) =>
  request("/prescriptions", { method: "POST", body: JSON.stringify(body) });

export const apiGetPrescriptions = (patientId?: string) =>
  request(`/prescriptions${patientId ? `?patientId=${patientId}` : ""}`);

// ── Medicines ─────────────────────────────────────────────────────────────────
export const apiGetMedicines = (search?: string) =>
  request(`/medicines${search ? `?search=${search}` : ""}`);

export const apiCreateMedicine = (body: object) =>
  request("/medicines", { method: "POST", body: JSON.stringify(body) });

// ── Revenue — Tier 1 ──────────────────────────────────────────────────────────
export const apiGetRevenueStats    = () => request("/revenue/stats");
export const apiGetAllStaffStats    = () => request("/revenue/all-staff-stats");
export const apiGetDoctorRevStats  = () => request("/revenue/doctor-stats");
export const apiGetMonthlyTrend    = () => request("/revenue/monthly-trend");

export const apiGetTransactions = (params?: {
  date?:     string;
  doctorId?: string;
  page?:     number;
  limit?:    number;
}) => {
  const q = new URLSearchParams();
  if (params?.date)     q.set("date",     params.date);
  if (params?.doctorId) q.set("doctorId", params.doctorId);
  if (params?.page)     q.set("page",     String(params.page));
  if (params?.limit)    q.set("limit",    String(params.limit));
  const qs = q.toString();
  return request(`/revenue/transactions${qs ? `?${qs}` : ""}`);
};

// ── Revenue — Tier 2 ──────────────────────────────────────────────────────────
export const apiGetDailyGraph = (
  opts: { period: "days"|"week"|"month"|"year"|"day"; days?: 7|14|30; date?: string } = { period: "days", days: 7 }
) => {
  const q = new URLSearchParams({ period: opts.period });
  if (opts.days)  q.set("days",  String(opts.days));
  if (opts.date)  q.set("date",  opts.date);
  return request(`/revenue/daily-graph?${q.toString()}`);
};

export const apiGetRevenueByDepartment = () => request("/revenue/by-department");

export const apiGetDoctorPerformance   = () => request("/revenue/doctor-performance");

export const apiGetPaymentBreakdown    = () => request("/revenue/payment-breakdown");

// ── Revenue — Tier 3 ──────────────────────────────────────────────────────────
export const apiGetWeeklyTrend  = ()  => request("/revenue/weekly-trend");
export const apiGetPeakHours = (period: "day" | "week" | "month" | "year" = "month", date?: string) => {
  const q = new URLSearchParams({ period });
  if (date) q.set("date", date);
  return request(`/revenue/peak-hours?${q.toString()}`);
};
export const apiGetDeptGrowth   = ()  => request("/revenue/dept-growth");
export const apiGetPending      = ()  => request("/revenue/pending");
export const apiGetAlerts       = ()  => request("/revenue/alerts");

// ── Payments ──────────────────────────────────────────────────────────────────
export const apiCreatePayment = (body: {
  patientId:     string;
  amount:        number;
  type?:         string;
  method?:       string;
  notes?:        string;
  queueEntryId?: string;
  doctorId?:     string;
}) => request("/payments", { method: "POST", body: JSON.stringify(body) });

export const apiGetPayments = (date?: string) =>
  request(`/payments${date ? `?date=${date}` : ""}`);

export const apiAssignDoctorByQueue = (queueEntryId: string, doctorId: string) =>
  request(`/payments/by-queue/${queueEntryId}/assign-doctor`, {
    method: "PATCH",
    body:   JSON.stringify({ doctorId }),
  });

// ── Salary Config ─────────────────────────────────────────────────────────────
export const apiGetSalaryConfigs = () => request("/salary/config");

export const apiGetDoctorSalaryConfig = (doctorId: string) =>
  request(`/salary/config/${doctorId}`);

export const apiUpsertSalaryConfig = (
  doctorId: string,
  body: {
    type:             "fixed" | "percentage" | "mixed";
    fixedAmount?:     number;
    percentage?:      number;
    mixedFixed?:      number;
    consultationPct?: number;
    procedurePct?:    number;
    notes?:           string;
  },
) => request(`/salary/config/${doctorId}`, { method: "POST", body: JSON.stringify(body) });

export const apiDeleteSalaryConfig = (doctorId: string) =>
  request(`/salary/config/${doctorId}`, { method: "DELETE" });

// ── Tier ──────────────────────────────────────────────────────────────────────
export const apiGetTier = () => request("/tier");

export const apiSetTier = (tier: 1 | 2 | 3, notes?: string) =>
  request("/tier", { method: "POST", body: JSON.stringify({ tier, notes }) });

// ── Pharmacy ──────────────────────────────────────────────────────────────────
export const apiPharmacyQueue          = ()         => request("/pharmacy/queue");
export const apiPharmacyLookup         = (code: string) => request(`/pharmacy/lookup/${encodeURIComponent(code)}`);
export const apiPharmacyLookupRx       = (rxCode: string) => request(`/pharmacy/lookup/rx/${encodeURIComponent(rxCode)}`);
export const apiPharmacyCollect        = (id: string, body: { paymentMethod: string }) =>
  request(`/pharmacy/collect/${id}`, { method: "POST", body: JSON.stringify(body) });
export const apiPharmacyMedicines      = ()         => request("/pharmacy/medicines");
export const apiPharmacyAddMedicine    = (body: any) =>
  request("/pharmacy/medicines", { method: "POST", body: JSON.stringify(body) });
export const apiPharmacyDeleteMedicine = (id: string) =>
  request(`/pharmacy/medicines/${id}`, { method: "DELETE" });
export const apiOtcCreate = (body: any) =>
  request("/pharmacy/otc", { method: "POST", body: JSON.stringify(body) });
export const apiOtcSales  = () => request("/pharmacy/otc");
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider } from "@/context/ClinicContext";

import LoginPage          from "@/pages/clinic-LoginPage";
import NotFound           from "@/pages/NotFound";
import DoctorAuthPage     from "@/pages/doctor/DoctorAuthPage";
import DoctorDashboard    from "@/pages/doctor/DoctorDashboard";
import DoctorDiagnosis    from "@/pages/doctor/DoctorDiagnosis";
import DoctorPrescription from "@/pages/doctor/DoctorPrescription";
import ReceptionAuthPage  from "@/pages/reception/ReceptionAuthPage";
import ReceptionDashboard from "@/pages/reception/ReceptionDashboard";
import PharmacyAuthPage   from "@/pages/pharmacy/PharmacyAuthPage";
import PharmacyDashboard  from "@/pages/pharmacy/PharmacyDashboard";
import PatientMobilePage  from "@/pages/patient/PatientMobilePage";

const requireAuth = (role: string, element: JSX.Element): JSX.Element => {
  const token = localStorage.getItem("cliniq_token");
  const user  = JSON.parse(localStorage.getItem("cliniq_user") || "null");
  if (!token || !user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return element;
};

const App = () => (
  <ClinicProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/"                    element={<LoginPage />} />
        <Route path="/doctor"              element={<DoctorAuthPage />} />
        <Route path="/doctor/dashboard"    element={requireAuth("doctor",     <DoctorDashboard />)} />
        <Route path="/doctor/diagnosis"    element={requireAuth("doctor",     <DoctorDiagnosis />)} />
        <Route path="/doctor/prescription" element={requireAuth("doctor",     <DoctorPrescription />)} />
        <Route path="/reception"           element={<ReceptionAuthPage />} />
        <Route path="/reception/dashboard" element={requireAuth("reception",  <ReceptionDashboard />)} />
        <Route path="/pharmacy"            element={<Navigate to="/pharmacy/login" replace />} />
        <Route path="/pharmacy/login"      element={<PharmacyAuthPage />} />
        <Route path="/pharmacy/dashboard"  element={requireAuth("pharmacist", <PharmacyDashboard />)} />
        <Route path="/patient"             element={<PatientMobilePage />} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </ClinicProvider>
);

export default App;
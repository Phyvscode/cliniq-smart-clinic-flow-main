import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider } from "@/context/ClinicContext";

import LoginPage          from "@/pages/LoginPage";
import NotFound           from "@/pages/NotFound";
import DoctorAuthPage     from "@/pages/doctor/DoctorAuthPage";
import DoctorDashboard    from "@/pages/doctor/DoctorDashboard";
import DoctorDiagnosis    from "@/pages/doctor/DoctorDiagnosis";
import DoctorPrescription from "@/pages/doctor/DoctorPrescription";
import DoctorConsultation from "@/pages/doctor/DoctorConsultation";
import ReceptionAuthPage  from "@/pages/reception/ReceptionAuthPage";
import ReceptionDashboard from "@/pages/reception/ReceptionDashboard";
import PharmacyAuthPage   from "@/pages/pharmacy/PharmacyAuthPage";
import PharmacyDashboard  from "@/pages/pharmacy/PharmacyDashboard";
import PatientMobilePage  from "@/pages/patient/PatientMobilePage";

// Auth guard — checks localStorage at render time
const RequireAuth = ({ role, children }: { role: string; children: JSX.Element }) => {
  const token = localStorage.getItem("cliniq_token");
  const user  = JSON.parse(localStorage.getItem("cliniq_user") || "null");
  if (!token || !user) return <Navigate to="/" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
};

const App = () => (
  <ClinicProvider>
    <HashRouter>
      <Routes>
        <Route path="/"                    element={<LoginPage />} />
        <Route path="/doctor"              element={<DoctorAuthPage />} />
        <Route path="/doctor/dashboard"    element={<RequireAuth role="doctor">     <DoctorDashboard />    </RequireAuth>} />
        <Route path="/doctor/diagnosis"    element={<RequireAuth role="doctor">     <DoctorDiagnosis />    </RequireAuth>} />
        <Route path="/doctor/prescription"  element={<RequireAuth role="doctor">     <DoctorPrescription /> </RequireAuth>} />
        <Route path="/doctor/consultation" element={<RequireAuth role="doctor">     <DoctorConsultation /> </RequireAuth>} />
        <Route path="/reception"           element={<ReceptionAuthPage />} />
        <Route path="/reception/dashboard" element={<RequireAuth role="reception">  <ReceptionDashboard /></RequireAuth>} />
        <Route path="/pharmacy"            element={<Navigate to="/pharmacy/login" replace />} />
        <Route path="/pharmacy/login"      element={<PharmacyAuthPage />} />
        <Route path="/pharmacy/dashboard"  element={<RequireAuth role="pharmacist"> <PharmacyDashboard />  </RequireAuth>} />
        <Route path="/patient"             element={<PatientMobilePage />} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>
    </HashRouter>
  </ClinicProvider>
);

export default App;
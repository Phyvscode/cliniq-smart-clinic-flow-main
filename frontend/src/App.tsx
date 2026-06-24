import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider } from "@/context/ClinicContext";

import LoginPage          from "@/pages/LoginPage";
import NotFound           from "@/pages/NotFound";
import DoctorAuthPage     from "@/pages/doctor/DoctorAuthPage";
import DoctorDashboard    from "@/pages/doctor/DoctorDashboard";
import DoctorDiagnosis    from "@/pages/doctor/DoctorDiagnosis";
import DoctorPrescription from "@/pages/doctor/DoctorPrescription";
import DoctorConsultation from "@/pages/doctor/DoctorConsultation";
import ReceptionAuthPage     from "@/pages/reception/ReceptionAuthPage";
import ReceptionDashboard    from "@/pages/reception/ReceptionDashboard";
import ReceptionPatient      from "@/pages/reception/ReceptionPatient";
import ReceptionChildren     from "@/pages/reception/ReceptionChildren";
import ReceptionAppointments from "@/pages/reception/ReceptionAppointments";
import ReceptionTests        from "@/pages/reception/ReceptionTests";
import ReceptionFollowUps    from "@/pages/reception/ReceptionFollowUps";
import ReceptionBeds         from "@/pages/reception/ReceptionBeds";
import PharmacyAuthPage   from "@/pages/pharmacy/PharmacyAuthPage";
import PharmacyDashboard  from "@/pages/pharmacy/PharmacyDashboard";
import LabAuthPage        from "@/pages/lab/LabAuthPage";
import LabDashboard       from "@/pages/lab/LabDashboard";
import DoctorLaboratory   from "@/pages/doctor/DoctorLaboratory";
import PatientMobilePage  from "@/pages/patient/PatientMobilePage";
import PatientHistoryPage from "@/pages/PatientHistoryPage";

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
        <Route path="/doctor/history"      element={<RequireAuth role="doctor">     <PatientHistoryPage portal="doctor" /> </RequireAuth>} />
        <Route path="/reception"           element={<ReceptionAuthPage />} />
        <Route path="/reception/dashboard"     element={<RequireAuth role="reception">  <ReceptionDashboard />    </RequireAuth>} />
        <Route path="/reception/patient"       element={<RequireAuth role="reception">  <ReceptionPatient />      </RequireAuth>} />
        <Route path="/reception/children"      element={<RequireAuth role="reception">  <ReceptionChildren />     </RequireAuth>} />
        <Route path="/reception/appointments"  element={<RequireAuth role="reception">  <ReceptionAppointments /></RequireAuth>} />
        <Route path="/reception/tests"         element={<RequireAuth role="reception">  <ReceptionTests />        </RequireAuth>} />
        <Route path="/reception/followups"     element={<RequireAuth role="reception">  <ReceptionFollowUps />    </RequireAuth>} />
        <Route path="/reception/beds"          element={<RequireAuth role="reception">  <ReceptionBeds />         </RequireAuth>} />
        <Route path="/reception/history"       element={<RequireAuth role="reception">  <PatientHistoryPage portal="reception" /> </RequireAuth>} />
        <Route path="/pharmacy"            element={<Navigate to="/pharmacy/login" replace />} />
        <Route path="/pharmacy/login"      element={<PharmacyAuthPage />} />
        <Route path="/pharmacy/dashboard"  element={<RequireAuth role="pharmacist"> <PharmacyDashboard />  </RequireAuth>} />
        <Route path="/doctor/laboratory"   element={<RequireAuth role="doctor">     <DoctorLaboratory />   </RequireAuth>} />
        <Route path="/lab"                 element={<LabAuthPage />} />
        <Route path="/lab/dashboard"       element={<RequireAuth role="lab_staff">  <LabDashboard />       </RequireAuth>} />
        <Route path="/patient"             element={<PatientMobilePage />} />
        <Route path="*"                    element={<NotFound />} />
      </Routes>
    </HashRouter>
  </ClinicProvider>
);

export default App;
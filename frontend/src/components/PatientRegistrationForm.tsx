import { useState } from "react";
import { motion } from "framer-motion";
import { UserPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useClinic } from "@/context/ClinicContext";

const GOV_ID_TYPES = ["Aadhaar", "Passport", "Driving License", "Voter ID"] as const;
const DEPARTMENTS = ["General Medicine", "Cardiology", "Orthopedics", "Dermatology", "ENT", "Pediatrics", "Gynecology", "Psychiatry", "Pulmonology"] as const;
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

interface Props {
  onSuccess: (message: string) => void;
}

const PatientRegistrationForm = ({ onSuccess }: Props) => {
  const { addPatient, addToQueue, findPatientByPhone, patients } = useClinic();

  // Basic
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Other">("Male");
  const [phone, setPhone] = useState("");
  // Contact
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pinCode, setPinCode] = useState("");
  // Relative
  const [relativeName, setRelativeName] = useState("");
  const [relativeRelationship, setRelativeRelationship] = useState("");
  const [relativePhone, setRelativePhone] = useState("");
  // Gov ID
  const [govIdType, setGovIdType] = useState("");
  const [govIdNumber, setGovIdNumber] = useState("");
  // Visit & Hospital Flow
  const [visitType, setVisitType] = useState<"OPD" | "IPD" | "Emergency">("OPD");
  const [department, setDepartment] = useState("");
  const [appointmentType, setAppointmentType] = useState<"New" | "Follow-up">("New");
  // Medical Safety
  const [bloodGroup, setBloodGroup] = useState("");
  const [allergies, setAllergies] = useState("");
  const [chronicConditions, setChronicConditions] = useState("");
  const [currentMedications, setCurrentMedications] = useState("");
  // Severity
  const [severity, setSeverity] = useState<"Normal" | "Urgent" | "Critical">("Normal");
  // Insurance
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [policyNumber, setPolicyNumber] = useState("");
  const [insuranceType, setInsuranceType] = useState<"Cashless" | "Reimbursement" | "">("");
  // Additional
  const [occupation, setOccupation] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [referredBy, setReferredBy] = useState<"Doctor" | "Online" | "Walk-in" | "">("");
  const [consentGiven, setConsentGiven] = useState(false);
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<typeof patients>([]);
  const [showSearch, setShowSearch] = useState(false);

  const resetForm = () => {
    setName(""); setAge(""); setPhone(""); setEmail(""); setAddress("");
    setPinCode(""); setRelativeName(""); setRelativeRelationship("");
    setRelativePhone(""); setGovIdType(""); setGovIdNumber("");
    setVisitType("OPD"); setDepartment(""); setAppointmentType("New");
    setBloodGroup(""); setAllergies(""); setChronicConditions(""); setCurrentMedications("");
    setSeverity("Normal"); setInsuranceProvider(""); setPolicyNumber(""); setInsuranceType("");
    setOccupation(""); setMaritalStatus(""); setReferredBy(""); setConsentGiven(false);
  };

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.length >= 3) {
      const results = patients.filter(p =>
        p.phone.includes(q) || p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.govIdNumber && p.govIdNumber.includes(q))
      );
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const loadPatient = (p: typeof patients[0]) => {
    setName(p.name); setAge(String(p.age)); setGender(p.gender); setPhone(p.phone);
    setEmail(p.email || ""); setAddress(p.address || ""); setPinCode(p.pinCode || "");
    setBloodGroup(p.bloodGroup || "");
    setShowSearch(false); setSearchQuery(""); setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!name.trim() || !age || !phone || phone.length < 10 || !consentGiven) return;
    const patient = addPatient({
      name, phone, age: parseInt(age), gender,
      email: email || undefined, address: address || undefined, pinCode: pinCode || undefined,
      bloodGroup: bloodGroup || undefined,
      relativeName: relativeName || undefined, relativeRelationship: relativeRelationship || undefined,
      relativePhone: relativePhone || undefined,
      govIdType: govIdType || undefined, govIdNumber: govIdNumber || undefined,
      visitType, department: department || undefined, appointmentType,
      allergies: allergies || undefined, chronicConditions: chronicConditions || undefined,
      currentMedications: currentMedications || undefined,
      severity, insuranceProvider: insuranceProvider || undefined,
      policyNumber: policyNumber || undefined, insuranceType: insuranceType || undefined,
      occupation: occupation || undefined, maritalStatus: maritalStatus || undefined,
      referredBy: referredBy || undefined, consentGiven,
      registeredAt: new Date().toISOString(), registeredBy: "Reception",
    });
    const entry = addToQueue(patient.id);
    onSuccess(`${patient.name} added to queue (#${entry.queueNumber})`);
    resetForm();
  };

  const inputClass = "h-11 rounded-xl";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";
  const sectionTitle = "text-sm font-semibold text-foreground";

  const ChipSelector = ({ options, value, onChange, multi = false }: {
    options: readonly string[]; value: string; onChange: (v: string) => void; multi?: boolean;
  }) => (
    <div className="flex gap-2 flex-wrap">
      {options.map(opt => (
        <button key={opt} onClick={() => onChange(opt)}
          className={`px-4 h-10 rounded-xl text-sm font-medium transition-all ${
            value === opt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >{opt}</button>
      ))}
    </div>
  );

  const severityColors: Record<string, string> = {
    Normal: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    Urgent: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    Critical: "bg-red-500/10 text-red-600 border-red-500/20",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="bg-card border border-border rounded-xl p-6">
        {/* Header with search toggle */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            <h3 className="font-medium text-foreground">Patient Registration</h3>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl gap-2" onClick={() => setShowSearch(!showSearch)}>
            <Search className="w-3.5 h-3.5" />
            Search Existing
          </Button>
        </div>

        {/* Search existing patient */}
        {showSearch && (
          <div className="mb-5 p-4 bg-muted/50 rounded-xl space-y-2">
            <Input placeholder="Search by name, phone, or ID number..." value={searchQuery}
              onChange={e => handleSearch(e.target.value)} className={inputClass} />
            {searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map(p => (
                  <button key={p.id} onClick={() => loadPatient(p)}
                    className="w-full text-left p-3 rounded-lg hover:bg-muted transition-colors flex justify-between items-center">
                    <span className="font-medium text-sm text-foreground">{p.name}</span>
                    <span className="text-xs text-muted-foreground">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {searchQuery.length >= 3 && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">No patients found</p>
            )}
          </div>
        )}

        <div className="space-y-5">
          {/* 1. Visit & Hospital Flow */}
          <div className="space-y-3">
            <p className={sectionTitle}>🏥 Visit & Hospital Flow</p>
            <div>
              <label className={labelClass}>Visit Type *</label>
              <ChipSelector options={["OPD", "IPD", "Emergency"]} value={visitType} onChange={v => setVisitType(v as any)} />
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <ChipSelector options={DEPARTMENTS} value={department} onChange={setDepartment} />
            </div>
            <div>
              <label className={labelClass}>Appointment Type</label>
              <ChipSelector options={["New", "Follow-up"]} value={appointmentType} onChange={v => setAppointmentType(v as any)} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 2. Basic Info */}
          <div className="space-y-3">
            <p className={sectionTitle}>👤 Basic Information</p>
            <div>
              <label className={labelClass}>Full Name *</label>
              <Input placeholder="Enter full name" value={name} onChange={e => setName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Age *</label>
              <Input placeholder="Age" type="number" value={age} onChange={e => setAge(e.target.value)} className={`${inputClass} w-28`} />
            </div>
            <div>
              <label className={labelClass}>Gender *</label>
              <ChipSelector options={["Male", "Female", "Other"]} value={gender} onChange={v => setGender(v as any)} />
            </div>
            <div>
              <label className={labelClass}>Phone Number *</label>
              <Input placeholder="10-digit mobile number" value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputClass} maxLength={10} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 3. Medical Safety */}
          <div className="space-y-3">
            <p className={sectionTitle}>🩺 Medical Safety Information</p>
            <div>
              <label className={labelClass}>Blood Group</label>
              <ChipSelector options={BLOOD_GROUPS} value={bloodGroup} onChange={setBloodGroup} />
            </div>
            <div>
              <label className={labelClass}>Allergies</label>
              <Input placeholder="e.g., Penicillin, Dust, Peanuts" value={allergies} onChange={e => setAllergies(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Chronic Conditions</label>
              <Input placeholder="e.g., Diabetes, Hypertension, Asthma" value={chronicConditions} onChange={e => setChronicConditions(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Medications</label>
              <Textarea placeholder="List any medications the patient is currently taking" value={currentMedications}
                onChange={e => setCurrentMedications(e.target.value)} className="rounded-xl min-h-[70px]" />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 4. Emergency Priority */}
          <div className="space-y-3">
            <p className={sectionTitle}>🚨 Emergency Priority</p>
            <div>
              <label className={labelClass}>Severity Level</label>
              <div className="flex gap-2">
                {(["Normal", "Urgent", "Critical"] as const).map(s => (
                  <button key={s} onClick={() => setSeverity(s)}
                    className={`flex-1 h-11 rounded-xl text-sm font-semibold transition-all border ${
                      severity === s ? severityColors[s] : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                    }`}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 5. Contact & Address */}
          <div className="space-y-3">
            <p className={sectionTitle}>📍 Contact & Address</p>
            <div>
              <label className={labelClass}>Email Address</label>
              <Input placeholder="email@example.com" type="email" value={email} onChange={e => setEmail(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Residential Address</label>
              <Input placeholder="Full address" value={address} onChange={e => setAddress(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>PIN Code</label>
              <Input placeholder="6-digit PIN" value={pinCode}
                onChange={e => setPinCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className={`${inputClass} w-32`} maxLength={6} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 6. Relative / Guardian */}
          <div className="space-y-3">
            <p className={sectionTitle}>👨‍👩‍👧 Relative / Guardian</p>
            <div>
              <label className={labelClass}>Name of Relative / Guardian</label>
              <Input placeholder="Guardian name" value={relativeName} onChange={e => setRelativeName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Relationship with Patient</label>
              <Input placeholder="e.g. Father, Spouse, Son" value={relativeRelationship} onChange={e => setRelativeRelationship(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contact Number</label>
              <Input placeholder="10-digit number" value={relativePhone}
                onChange={e => setRelativePhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputClass} maxLength={10} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 7. Government ID */}
          <div className="space-y-3">
            <p className={sectionTitle}>🪪 Government ID</p>
            <div>
              <label className={labelClass}>ID Type</label>
              <ChipSelector options={GOV_ID_TYPES} value={govIdType} onChange={setGovIdType} />
            </div>
            {govIdType && (
              <div>
                <label className={labelClass}>{govIdType} Number</label>
                <Input placeholder={`Enter ${govIdType} number`} value={govIdNumber} onChange={e => setGovIdNumber(e.target.value)} className={inputClass} />
              </div>
            )}
          </div>

          <div className="border-t border-border" />

          {/* 8. Insurance */}
          <div className="space-y-3">
            <p className={sectionTitle}>🛡️ Insurance Details {visitType !== "IPD" && <span className="text-xs font-normal text-muted-foreground">(Optional)</span>}</p>
            <div>
              <label className={labelClass}>Insurance Provider</label>
              <Input placeholder="e.g., Star Health, ICICI Lombard" value={insuranceProvider} onChange={e => setInsuranceProvider(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Policy Number</label>
              <Input placeholder="Policy number" value={policyNumber} onChange={e => setPolicyNumber(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Insurance Type</label>
              <ChipSelector options={["Cashless", "Reimbursement"]} value={insuranceType} onChange={v => setInsuranceType(v as any)} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 9. Additional */}
          <div className="space-y-3">
            <p className={sectionTitle}>📋 Additional Information</p>
            <div>
              <label className={labelClass}>Occupation</label>
              <Input placeholder="e.g., Engineer, Teacher" value={occupation} onChange={e => setOccupation(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Marital Status</label>
              <ChipSelector options={["Single", "Married", "Divorced", "Widowed"]} value={maritalStatus} onChange={setMaritalStatus} />
            </div>
            <div>
              <label className={labelClass}>Referred By</label>
              <ChipSelector options={["Doctor", "Online", "Walk-in"]} value={referredBy} onChange={v => setReferredBy(v as any)} />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* 10. Consent */}
          <div className="space-y-3">
            <p className={sectionTitle}>✅ Consent & Legal</p>
            <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl">
              <Checkbox id="consent" checked={consentGiven} onCheckedChange={v => setConsentGiven(v === true)} className="mt-0.5" />
              <label htmlFor="consent" className="text-sm text-foreground leading-relaxed cursor-pointer">
                I consent to treatment and agree that my data may be used for medical records, insurance processing, and clinic management purposes.
              </label>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full h-12 rounded-xl text-base mt-2"
            disabled={!name.trim() || !age || !phone || phone.length < 10 || !consentGiven}>
            Register & Add to Queue
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default PatientRegistrationForm;

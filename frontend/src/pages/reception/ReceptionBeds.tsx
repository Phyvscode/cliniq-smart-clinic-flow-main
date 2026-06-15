import { useState } from "react";
import { Search, Bell } from "lucide-react";
import { motion } from "framer-motion";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

type BedStatus = "occupied" | "available" | "cleaning";
interface Bed { id: string; patient?: string; discharge?: string; status: BedStatus; }
interface Floor { label: string; beds: Bed[]; }

const mkBed = (id: string, status: BedStatus, patient?: string, discharge?: string): Bed =>
  ({ id, status, patient, discharge });

const FLOORS: Floor[] = [
  {
    label: "Floor 1",
    beds: [
      mkBed("F1-01","occupied","Aarav S.","3d"), mkBed("F1-02","occupied","Aarav S.","2d"),
      mkBed("F1-03","occupied","Ishita R.","2d"), mkBed("F1-04","occupied","Vikram S.","3d"),
      mkBed("F1-05","cleaning"), mkBed("F1-06","cleaning"),
      mkBed("F1-07","occupied","Ishita R.","3d"), mkBed("F1-08","cleaning"),
      mkBed("F1-09","occupied","Ishita R.","3d"), mkBed("F1-10","cleaning"),
      mkBed("F1-11","occupied","Neha V.","1d"), mkBed("F1-12","occupied","Neha V.","2d"),
      mkBed("F1-13","cleaning"), mkBed("F1-14","occupied","Vikram S.","2d"),
      mkBed("F1-15","available"), mkBed("F1-16","occupied","Ishita R.","3d"),
    ],
  },
  {
    label: "Floor 2",
    beds: [
      mkBed("F2-01","occupied","Vikram S.","1d"), mkBed("F2-02","occupied","Neha V.","2d"),
      mkBed("F2-03","available"), mkBed("F2-04","occupied","Vikram S.","2d"),
      mkBed("F2-05","cleaning"), mkBed("F2-06","cleaning"),
      mkBed("F2-07","occupied","Aarav S.","3d"), mkBed("F2-08","occupied","Neha V.","1d"),
      mkBed("F2-09","occupied","Ishita R.","2d"), mkBed("F2-10","available"),
      mkBed("F2-11","occupied","Aarav S.","2d"), mkBed("F2-12","occupied","Vikram S.","1d"),
      mkBed("F2-13","cleaning"),
    ],
  },
  {
    label: "Floor 3",
    beds: [
      mkBed("F3-01","occupied","Priya M.","2d"), mkBed("F3-02","cleaning"),
      mkBed("F3-03","occupied","Raj S.","1d"), mkBed("F3-04","available"),
      mkBed("F3-05","occupied","Sita D.","3d"), mkBed("F3-06","occupied","Arjun K.","2d"),
      mkBed("F3-07","cleaning"), mkBed("F3-08","occupied","Pooja R.","1d"),
      mkBed("F3-09","available"), mkBed("F3-10","occupied","Kiran B.","2d"),
    ],
  },
  {
    label: "Floor 4",
    beds: [
      mkBed("F4-01","occupied","Anita V.","2d"), mkBed("F4-02","occupied","Mohan L.","1d"),
      mkBed("F4-03","cleaning"), mkBed("F4-04","occupied","Deepa S.","3d"),
      mkBed("F4-05","available"), mkBed("F4-06","occupied","Ravi K.","2d"),
      mkBed("F4-07","occupied","Sunita R.","1d"), mkBed("F4-08","cleaning"),
    ],
  },
];

const allBeds  = FLOORS.flatMap(f => f.beds);
const occupied  = allBeds.filter(b => b.status === "occupied").length;
const available = allBeds.filter(b => b.status === "available").length;
const cleaning  = allBeds.filter(b => b.status === "cleaning").length;

const statusDot = (s: BedStatus) =>
  s === "occupied" ? "bg-red-500" : s === "available" ? "bg-emerald-500" : "bg-amber-500";

const BedCard = ({ bed }: { bed: Bed }) => (
  <div className={`rounded-xl border p-3 relative ${
    bed.status === "occupied" ? "border-red-100 dark:border-red-500/20 bg-white dark:bg-red-500/5"
    : bed.status === "available" ? "border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5"
    : "border-amber-100 dark:border-amber-500/20 bg-white dark:bg-amber-500/5"
  }`}>
    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusDot(bed.status)}`} />
    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{bed.id}</p>
    {bed.patient ? (
      <>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{bed.patient}</p>
        {bed.discharge && <p className="text-[10px] text-gray-400 dark:text-gray-600">discharge {bed.discharge}</p>}
      </>
    ) : (
      <p className="text-xs text-gray-400 dark:text-gray-600 capitalize">{bed.status}</p>
    )}
  </div>
);

const ReceptionBeds = () => {
  const [search, setSearch] = useState("");

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="beds" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patients, doctors, actions..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <ThemeToggle />
          <button className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <Bell className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
              {allBeds.length} BEDS ACROSS {FLOORS.length} FLOORS
            </p>
            <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
              Rooms are{" "}
              <em className="text-gray-400 dark:text-gray-600 italic font-serif">breathing</em>
              {" "}comfortably.
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Live bed occupancy, expected discharges and cleaning queues.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "OCCUPIED",  value: occupied,  dot: "bg-red-500"     },
                { label: "AVAILABLE", value: available, dot: "bg-emerald-500" },
                { label: "CLEANING",  value: cleaning,  dot: "bg-amber-500"   },
              ].map(s => (
                <div key={s.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <p className="text-[10px] font-semibold tracking-widest text-gray-400 dark:text-gray-600">{s.label}</p>
                  </div>
                  <p className="text-5xl font-serif text-gray-900 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Floors */}
            <div className="space-y-6">
              {FLOORS.map(floor => {
                const floorOccupied  = floor.beds.filter(b => b.status === "occupied").length;
                const floorAvailable = floor.beds.filter(b => b.status === "available").length;
                const filtered = search
                  ? floor.beds.filter(b => b.id.toLowerCase().includes(search.toLowerCase()) || b.patient?.toLowerCase().includes(search.toLowerCase()))
                  : floor.beds;
                if (search && filtered.length === 0) return null;
                return (
                  <div key={floor.label} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-serif text-gray-900 dark:text-white">{floor.label}</h2>
                      <p className="text-xs text-gray-400 dark:text-gray-600">
                        {floorOccupied} occupied · {floorAvailable} free
                      </p>
                    </div>
                    <div className="grid grid-cols-8 gap-2">
                      {filtered.map(bed => <BedCard key={bed.id} bed={bed} />)}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionBeds;

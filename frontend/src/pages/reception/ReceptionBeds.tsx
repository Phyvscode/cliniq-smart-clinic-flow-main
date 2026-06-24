import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import ReceptionSidebar from "@/components/reception/ReceptionSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { apiGetBeds, apiVacateBed } from "@/lib/api";

interface Bed {
  _id:        string;
  floor:      string;
  bedNumber:  string;
  status:     "available" | "occupied";
  patient?:   { name: string; age?: number; gender?: string; permanentCode?: string } | null;
}

const statusDot = (s: Bed["status"]) => s === "occupied" ? "bg-red-500" : "bg-emerald-500";

const BedCard = ({ bed, onVacate }: { bed: Bed; onVacate: (id: string) => void }) => (
  <div className={`rounded-xl border p-3 relative ${
    bed.status === "occupied"
      ? "border-red-100 dark:border-red-500/20 bg-white dark:bg-red-500/5"
      : "border-emerald-100 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5"
  }`}>
    <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusDot(bed.status)}`} />
    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-0.5">{bed.bedNumber}</p>
    {bed.patient ? (
      <>
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{bed.patient.name}</p>
        <button onClick={() => onVacate(bed._id)}
          className="text-[10px] text-red-500 hover:text-red-600 mt-1 underline-offset-2 hover:underline">
          Vacate
        </button>
      </>
    ) : (
      <p className="text-xs text-gray-400 dark:text-gray-600">Available</p>
    )}
  </div>
);

const ReceptionBeds = () => {
  const [search,  setSearch]  = useState("");
  const [beds,    setBeds]    = useState<Bed[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await apiGetBeds(); setBeds(r.beds || []); }
    catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, [load]);

  const handleVacate = async (id: string) => {
    if (!confirm("Vacate this bed?")) return;
    try { await apiVacateBed(id); load(); } catch {}
  };

  const occupied  = beds.filter(b => b.status === "occupied").length;
  const available = beds.filter(b => b.status === "available").length;

  const floors = [...new Set(beds.map(b => b.floor))];

  return (
    <div className="flex h-screen bg-[#f5f5fa] dark:bg-[#0a0a0f] overflow-hidden">
      <ReceptionSidebar active="beds" />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="bg-white dark:bg-[#0d0d1a] border-b border-gray-100 dark:border-white/5 px-6 py-3 flex items-center gap-3 shrink-0">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search bed number or patient..."
              className="w-full h-9 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-10 text-sm text-gray-700 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:border-gray-300 transition-colors" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-300 dark:text-gray-700 border border-gray-200 dark:border-gray-700 rounded px-1">⌘K</span>
          </div>
          <ThemeToggle />
          <button onClick={load} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-8">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p className="text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-600 mb-2">
              {beds.length} BEDS ACROSS {floors.length} FLOOR{floors.length !== 1 ? "S" : ""}
            </p>
            <h1 className="text-4xl lg:text-5xl font-serif text-gray-900 dark:text-white leading-tight mb-1.5">
              Rooms are{" "}
              <em className="text-gray-400 dark:text-gray-600 italic font-serif">breathing</em>
              {" "}comfortably.
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Live bed occupancy. Beds are assigned from the Patient page when admitting, and free up automatically when the patient leaves the queue.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "OCCUPIED",  value: occupied,  dot: "bg-red-500"     },
                { label: "AVAILABLE", value: available, dot: "bg-emerald-500" },
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
            {beds.length === 0 ? (
              <div className="bg-white dark:bg-[#0d0d1a] rounded-2xl border border-gray-200 dark:border-white/5 py-16 text-center">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {loading ? "Loading…" : "No beds configured yet. Ask admin to set up the bed layout."}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {floors.map(floor => {
                  const floorBeds = beds.filter(b => b.floor === floor);
                  const floorOccupied  = floorBeds.filter(b => b.status === "occupied").length;
                  const floorAvailable = floorBeds.filter(b => b.status === "available").length;
                  const filtered = search
                    ? floorBeds.filter(b => b.bedNumber.toLowerCase().includes(search.toLowerCase()) || b.patient?.name?.toLowerCase().includes(search.toLowerCase()))
                    : floorBeds;
                  if (search && filtered.length === 0) return null;
                  return (
                    <div key={floor} className="bg-white dark:bg-[#0d0d1a] border border-gray-200 dark:border-white/5 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-serif text-gray-900 dark:text-white">{floor}</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-600">
                          {floorOccupied} occupied · {floorAvailable} free
                        </p>
                      </div>
                      <div className="grid grid-cols-8 gap-2">
                        {filtered.map(bed => <BedCard key={bed._id} bed={bed} onVacate={handleVacate} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ReceptionBeds;

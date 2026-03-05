import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
  ArrowRight,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Car,
  Eye,
  Edit,
  MapPin,
  Heart,
  Award,
  ChevronUp,
  ChevronDown,
  Info,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { careGiverService } from "../../services/careGiverService";
import { careReceiverService } from "../../services/careReceiverService";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function monthRange() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end:   new Date(now.getFullYear(), now.getMonth() + 1, 0),
    label: now.toLocaleString("en-GB", { month: "long", year: "numeric" }),
  };
}

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function getTodayLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

// ─── Availability helpers ─────────────────────────────────────────────────────

function parseTime(t) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function cgAvailability(availability) {
  if (!availability?.length) return null;
  let totalMins = 0;
  let availDays = 0;
  for (const day of availability) {
    const slots = day.slots ?? [];
    if (slots.length) {
      availDays++;
      for (const s of slots) totalMins += parseTime(s.endTime) - parseTime(s.startTime);
    }
  }
  return { availDays, totalDays: availability.length, weeklyHrs: +(totalMins / 60).toFixed(1) };
}

// ─── Loyalty helpers (MongoDB ObjectId timestamp) ─────────────────────────────

function tenureFromId(id) {
  if (!id || id.length < 8) return null;
  return new Date(parseInt(id.substring(0, 8), 16) * 1000);
}

function tenureLabel(id) {
  const d = tenureFromId(id);
  if (!d) return "—";
  const months = Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24 * 30.5));
  if (months < 1) return "This month";
  if (months < 12) return `${months}mo`;
  const y = Math.floor(months / 12), r = months % 12;
  return r > 0 ? `${y}y ${r}mo` : `${y}y`;
}

function loyaltyTier(id, isActive) {
  if (!isActive) return { label: "Inactive", cls: "bg-gray-100 text-gray-500" };
  const d = tenureFromId(id);
  const months = d ? Math.floor((Date.now() - d) / (1000 * 60 * 60 * 24 * 30.5)) : 0;
  if (months >= 12) return { label: "Long-term",  cls: "bg-emerald-100 text-emerald-700" };
  if (months >= 6)  return { label: "Established", cls: "bg-sky-100 text-sky-700" };
  if (months >= 2)  return { label: "Regular",     cls: "bg-violet-100 text-violet-700" };
  return                     { label: "New",        cls: "bg-amber-100 text-amber-700" };
}

// ─── Build per-carer performance stats from appointments ─────────────────────

function buildCarerStats(appointments) {
  const map = {}; // careGiverId → stats

  const ensure = (id, name) => {
    if (!map[id]) map[id] = { name, total: 0, completed: 0, inProgress: 0, missed: 0, cancelled: 0, completedMins: 0, totalMins: 0 };
  };

  for (const apt of appointments) {
    const cgId   = apt.careGiver?._id;
    const cgName = apt.careGiver?.name || "";
    if (!cgId) continue;
    ensure(cgId, cgName);

    const s = map[cgId];
    const dur = apt.duration ?? 0;
    s.total++;
    s.totalMins += dur;
    if (apt.status === "completed")  { s.completed++; s.completedMins += dur; }
    if (apt.status === "in_progress") s.inProgress++;
    if (apt.status === "missed")      s.missed++;
    if (apt.status === "cancelled")   { s.cancelled++; s.total--; s.totalMins -= dur; } // exclude cancelled from total

    // also count double-handed secondary
    const sg = apt.secondaryCareGiver;
    if (sg?._id) {
      ensure(sg._id, sg.name || "");
      const ss = map[sg._id];
      ss.total++;
      ss.totalMins += dur;
      if (apt.status === "completed")   { ss.completed++; ss.completedMins += dur; }
      if (apt.status === "in_progress") ss.inProgress++;
      if (apt.status === "missed")      ss.missed++;
      if (apt.status === "cancelled")   { ss.cancelled++; ss.total--; ss.totalMins -= dur; }
    }
  }

  // Compute rates
  for (const s of Object.values(map)) {
    s.completionRate = s.total > 0 ? Math.round((s.completed / s.total) * 100) : null;
    s.completedHrs   = +(s.completedMins / 60).toFixed(1);
    s.totalHrs       = +(s.totalMins / 60).toFixed(1);
  }

  return map;
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function SkeletonBlock({ className = "" }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

function MiniBar({ pct, color = "bg-emerald-500" }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(pct ?? 0, 100)}%` }} />
    </div>
  );
}

function CompletionBar({ rate }) {
  const n = parseFloat(rate) || 0;
  const color = n >= 80 ? "bg-emerald-500" : n >= 50 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(n, 100)}%` }} />
    </div>
  );
}

function InsightChip({ level, children }) {
  const styles = { good: "bg-green-50 text-green-700 border-green-200", warn: "bg-amber-50 text-amber-700 border-amber-200", info: "bg-primary-50 text-primary-700 border-primary-200" };
  const icons  = { good: <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />, warn: <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />, info: <Activity className="h-3.5 w-3.5 flex-shrink-0" /> };
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${styles[level]}`}>{icons[level]}{children}</span>;
}

function avatarColor(name = "") {
  const palette = ["bg-violet-500","bg-primary-600","bg-sky-500","bg-emerald-500","bg-rose-500","bg-amber-500","bg-teal-500","bg-indigo-500"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

function Avatar({ name, size = "w-8 h-8 text-xs" }) {
  const parts = (name || "?").trim().split(" ");
  const initials = parts.length >= 2 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return (
    <div className={`rounded-full flex items-center justify-center font-bold text-white select-none flex-shrink-0 ${size} ${avatarColor(name)}`}>
      {initials.toUpperCase()}
    </div>
  );
}

function SortBtn({ col, current, dir, onSort }) {
  const active = current === col;
  return (
    <button onClick={() => onSort(col)}
      className={`transition-colors ${active ? "text-primary-600" : "text-gray-300 hover:text-gray-500"}`}>
      {active && dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Care Giver Performance Table ─────────────────────────────────────────────

function CareGiverTable({ careGivers, carerStats, isLoading, aptsLoading, onNavigate }) {
  const [sort, setSort]     = useState({ col: "completionRate", dir: "desc" });
  const [search, setSearch] = useState("");

  function doSort(col) {
    setSort(s => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" }));
  }

  const rows = careGivers
    .filter(cg => cg.name.toLowerCase().includes(search.toLowerCase()))
    .map(cg => {
      const stats = carerStats[cg._id] ?? null;
      const avail = cgAvailability(cg.availability);
      return { ...cg, _stats: stats, _avail: avail };
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "name")           return dir * a.name.localeCompare(b.name);
      if (sort.col === "completionRate") return dir * ((a._stats?.completionRate ?? -1) - (b._stats?.completionRate ?? -1));
      if (sort.col === "completedHrs")   return dir * ((a._stats?.completedHrs ?? 0)   - (b._stats?.completedHrs ?? 0));
      if (sort.col === "availDays")      return dir * ((a._avail?.availDays ?? -1)      - (b._avail?.availDays ?? -1));
      return 0;
    });

  const Th = ({ col, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
      <span className="flex items-center gap-1">{label}<SortBtn col={col} current={sort.col} dir={sort.dir} onSort={doSort} /></span>
    </th>
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
          className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 max-w-md">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            <strong>Hours completed</strong> = sum of completed visit durations this month.
            <strong> Availability</strong> = carer's weekly schedule setup.
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <SkeletonBlock key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No care givers found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th col="name"           label="Carer" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <Th col="availDays"      label="Availability" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Unavailable</th>
                <Th col="completedHrs"   label="Hrs Completed" />
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(cg => {
                const s = cg._stats;
                const av = cg._avail;
                const unavailDays = av ? (av.totalDays - av.availDays) : null;

                return (
                  <tr key={cg._id} className="hover:bg-gray-50 transition-colors">
                    {/* Carer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={cg.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{cg.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {cg.address?.city || cg.address?.postcode || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cg.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {cg.isActive ? "Active" : "Inactive"}
                        </span>
                        {cg.canDrive && (
                          <div>
                            <span className="inline-flex items-center gap-1 text-xs text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full">
                              <Car className="h-3 w-3" />Driver
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Availability */}
                    <td className="px-4 py-3">
                      {av ? (
                        <div>
                          <p className="font-semibold text-gray-800">{av.availDays}<span className="text-gray-400 font-normal text-xs"> / {av.totalDays} days</span></p>
                          <p className="text-xs text-gray-400">{av.weeklyHrs}h per week</p>
                          <MiniBar pct={(av.availDays / av.totalDays) * 100} color="bg-primary-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Not set</span>
                      )}
                    </td>

                    {/* Unavailable */}
                    <td className="px-4 py-3">
                      {unavailDays !== null ? (
                        <div>
                          <p className="font-semibold text-gray-800">
                            {unavailDays}
                            <span className="text-gray-400 font-normal text-xs"> days/wk</span>
                          </p>
                          {unavailDays === 0
                            ? <p className="text-xs text-emerald-600">Fully available</p>
                            : <p className="text-xs text-gray-400">{7 - (av?.availDays ?? 0)} of 7 days off</p>
                          }
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Month visits */}
                    <td className="px-4 py-3">
                      {aptsLoading ? <SkeletonBlock className="h-4 w-10" /> : s ? (
                        <div>
                          <p className="font-semibold text-gray-800">{s.total}</p>
                          <p className="text-xs text-gray-400">
                            {s.completed} done{s.missed > 0 && ` · ${s.missed} missed`}
                          </p>
                        </div>
                      ) : <span className="text-xs text-gray-400">No visits</span>}
                    </td>

                    {/* Hours completed */}
                    <td className="px-4 py-3">
                      {aptsLoading ? <SkeletonBlock className="h-4 w-12" /> : s ? (
                        <div>
                          <p className="font-semibold text-gray-800">{s.completedHrs}h</p>
                          <p className="text-xs text-gray-400">of {s.totalHrs}h assigned</p>
                        </div>
                      ) : <span className="text-xs text-gray-400">—</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => onNavigate(`/caregivers/${cg._id}`)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => onNavigate(`/caregivers/${cg._id}/edit`)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1 ml-1" title="Edit"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => onNavigate(`/caregivers/${cg._id}/availability`)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1 ml-1" title="Availability"><Calendar className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Care Receiver Loyalty Table ─────────────────────────────────────────────

function CareReceiverTable({ careReceivers, isLoading, onNavigate }) {
  const [sort, setSort]     = useState({ col: "tenure", dir: "desc" });
  const [search, setSearch] = useState("");

  function doSort(col) { setSort(s => ({ col, dir: s.col === col && s.dir === "desc" ? "asc" : "desc" })); }

  const rows = careReceivers
    .filter(cr => cr.name.toLowerCase().includes(search.toLowerCase()))
    .map(cr => {
      const d = tenureFromId(cr._id);
      const tenureMs  = d ? Date.now() - d : 0;
      const totalMins = cr.dailyVisits?.reduce((s, v) => s + (v.duration || 0), 0) ?? 0;
      const reqSet    = new Set(cr.dailyVisits?.flatMap(v => v.requirements ?? []));
      return { ...cr, _tenureMs: tenureMs, _totalMins: totalMins, _reqCount: reqSet.size };
    })
    .sort((a, b) => {
      const dir = sort.dir === "asc" ? 1 : -1;
      if (sort.col === "name")   return dir * a.name.localeCompare(b.name);
      if (sort.col === "tenure") return dir * (a._tenureMs - b._tenureMs);
      if (sort.col === "visits") return dir * ((a.dailyVisits?.length ?? 0) - (b.dailyVisits?.length ?? 0));
      if (sort.col === "load")   return dir * (a._totalMins - b._totalMins);
      return 0;
    });

  const Th = ({ col, label }) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
      <span className="flex items-center gap-1">{label}<SortBtn col={col} current={sort.col} dir={sort.dir} onSort={doSort} /></span>
    </th>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
          className="w-full sm:w-64 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-400" />
        <div className="flex items-start gap-1.5 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 max-w-md">
          <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-gray-400" />
          <span>
            <strong>Loyalty tier</strong> = based on how long the client has been registered.
            <strong> Care load</strong> = total daily visit duration from their care plan.
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <SkeletonBlock key={i} className="h-16 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No clients found.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <Th col="name"           label="Client" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <Th col="tenure"         label="Client Since" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Loyalty</th>
                <Th col="visits"         label="Daily Visits" />
                <Th col="load"           label="Care Load" />
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Requirements</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map(cr => {
                const tier    = loyaltyTier(cr._id, cr.isActive);
                const created = tenureFromId(cr._id);
                const hrs = cr._totalMins >= 60
                  ? `${Math.floor(cr._totalMins / 60)}h${cr._totalMins % 60 > 0 ? ` ${cr._totalMins % 60}m` : ""}`
                  : cr._totalMins > 0 ? `${cr._totalMins}m` : "—";
                const hasDouble = cr.dailyVisits?.some(v => v.doubleHanded);

                return (
                  <tr key={cr._id} className="hover:bg-gray-50 transition-colors">
                    {/* Client */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={cr.name} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{cr.name}</p>
                          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {cr.address?.city || cr.address?.postcode || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cr.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {cr.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>

                    {/* Client Since */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{tenureLabel(cr._id)}</p>
                      <p className="text-xs text-gray-400">{created ? created.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "—"}</p>
                    </td>

                    {/* Loyalty tier */}
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tier.cls}`}>{tier.label}</span>
                    </td>

                    {/* Daily Visits */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold text-gray-800">{cr.dailyVisits?.length ?? 0}</span>
                        {hasDouble && (
                          <span className="text-xs bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Users className="h-3 w-3" />2-handed
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cr.dailyVisits?.map(v => v.preferredTime).filter(Boolean).slice(0, 2).join(", ")}
                      </p>
                    </td>

                    {/* Care Load */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">{hrs}</p>
                      <p className="text-xs text-gray-400">per day</p>
                    </td>

                    {/* Requirements */}
                    <td className="px-4 py-3">
                      {cr._reqCount > 0
                        ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{cr._reqCount} skill{cr._reqCount !== 1 ? "s" : ""} needed</span>
                        : <span className="text-xs text-gray-400">Standard</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => onNavigate(`/carereceivers/${cr._id}`)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1" title="View"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => onNavigate(`/carereceivers/${cr._id}/edit`)}
                        className="text-gray-400 hover:text-primary-600 transition-colors p-1 ml-1" title="Edit"><Edit className="h-4 w-4" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

async function fetchDashboardStats(startDate, endDate) {
  const [cgRes, crRes, schedRes] = await Promise.all([
    careGiverService.getAll({ limit: 1 }),
    careReceiverService.getAll({ limit: 1 }),
    api.get("/schedule/stats", { params: { startDate, endDate } })
       .catch(() => ({ data: { data: { stats: {} } } })),
  ]);
  const s = schedRes.data?.data?.stats || {};
  return {
    careGivers:     cgRes.data?.pagination?.total || 0,
    careReceivers:  crRes.data?.pagination?.total || 0,
    appointments:   s.total || 0,
    completionRate: s.completionRate || "0%",
  };
}

function Dashboard() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [activeTab, setActiveTab] = useState("givers");

  const { start, end, label: monthLabel } = monthRange();
  const startDate = formatDate(start);
  const endDate   = formatDate(end);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", startDate, endDate],
    queryFn:  () => fetchDashboardStats(startDate, endDate),
    staleTime: 5 * 60 * 1000,
  });

  const { data: cgData,  isLoading: cgLoading } = useQuery({
    queryKey: ["dashboard-caregivers"],
    queryFn:  () => careGiverService.getAll({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  const { data: crData, isLoading: crLoading } = useQuery({
    queryKey: ["dashboard-carereceivers"],
    queryFn:  () => careReceiverService.getAll({ limit: 200 }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch ALL appointments this month in one call → group client-side
  const { data: aptsData, isLoading: aptsLoading } = useQuery({
    queryKey: ["dashboard-appointments", startDate, endDate],
    queryFn:  () => api.get("/schedule/appointments", { params: { startDate, endDate, limit: 5000 } }),
    staleTime: 5 * 60 * 1000,
  });

  const careGivers    = cgData?.data?.careGivers     ?? [];
  const careReceivers = crData?.data?.careReceivers  ?? [];
  const appointments   = aptsData?.data?.data?.appointments ?? [];
  const carerStats = buildCarerStats(appointments);

  const completionN = parseFloat(stats?.completionRate) || 0;
  const careRatio   = stats?.careGivers > 0 ? (stats.careReceivers / stats.careGivers).toFixed(1) : "—";
  const apptPerCg   = stats?.careGivers > 0 ? (stats.appointments  / stats.careGivers).toFixed(1) : "—";

  const completionInsight = completionN >= 80
    ? { level: "good", text: "Strong completion rate this month" }
    : completionN >= 50
      ? { level: "warn", text: "Completion rate needs attention" }
      : { level: "warn", text: "Low completion rate — review scheduling" };

  const ratioInsight = (stats?.careGivers > 0 && stats?.careReceivers / stats?.careGivers > 3)
    ? { level: "warn", text: "High receiver-to-giver ratio" }
    : { level: "good", text: "Care team capacity looks balanced" };

  const activeGivers    = careGivers.filter(cg => cg.isActive).length;
  const longTermClients = careReceivers.filter(cr => {
    const d = tenureFromId(cr._id);
    return d && (Date.now() - d) / (1000 * 60 * 60 * 24 * 30.5) >= 6;
  }).length;

  return (
    <div className="min-h-full bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-primary-700 via-primary-600 to-primary-500 px-8 pt-10 pb-14 text-white">
        <p className="text-primary-200 text-sm font-medium mb-1">{getTodayLabel()}</p>
        <h1 className="text-3xl font-bold">{getGreeting()}, {user?.name?.split(" ")[0] || "there"}</h1>
        <p className="text-primary-100 mt-1.5 text-sm">Here's how your care network is performing this month.</p>
      </div>

      <div className="px-8 -mt-6 pb-10 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Care Givers",     value: stats?.careGivers,    icon: Users,     accent: "border-primary-500", iconBg: "bg-primary-50 text-primary-600",  sub: "registered",           path: "/caregivers" },
            { label: "Care Receivers",  value: stats?.careReceivers, icon: UserCheck, accent: "border-emerald-500", iconBg: "bg-emerald-50 text-emerald-600",  sub: "active clients",        path: "/carereceivers" },
            { label: "Appointments",    value: stats?.appointments,  icon: Calendar,  accent: "border-sky-500",     iconBg: "bg-sky-50 text-sky-600",          sub: "scheduled this month",  path: "/schedule" },
            { label: "Completion Rate", value: stats?.completionRate, icon: TrendingUp,
              accent: completionN >= 80 ? "border-green-500" : "border-amber-400",
              iconBg: completionN >= 80 ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600",
              sub: "of visits completed", path: "/schedule" },
          ].map(card => (
            <button key={card.label} onClick={() => navigate(card.path)}
              className={`bg-white rounded-xl shadow-sm border-l-4 ${card.accent} p-5 text-left hover:shadow-md transition-shadow group`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">
                    {isLoading ? <SkeletonBlock className="h-9 w-16 mt-1" /> : card.value}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${card.iconBg} ml-3`}><card.icon className="h-5 w-5" /></div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 mt-3 transition-colors" />
            </button>
          ))}
        </div>

        {/* Middle row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-base">Monthly Overview</h2>
              <span className="text-xs text-gray-400">{monthLabel}</span>
            </div>
            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gray-600 font-medium">Visit Completion</span>
                <span className="text-sm font-bold text-gray-800">{isLoading ? "—" : stats?.completionRate}</span>
              </div>
              <CompletionBar rate={isLoading ? "0" : stats?.completionRate} />
              <p className="text-xs text-gray-400 mt-1.5">Percentage of scheduled visits completed this month</p>
            </div>
            <div className="h-px bg-gray-100" />
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, label: "Care Ratio",   value: isLoading ? null : careRatio, sub: "receivers per care giver" },
                { icon: Zap,   label: "Load / Giver", value: isLoading ? null : apptPerCg, sub: "appointments per care giver" },
              ].map(m => (
                <div key={m.label} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <m.icon className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{m.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{m.value === null ? <SkeletonBlock className="h-8 w-12" /> : m.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                </div>
              ))}
            </div>
            <div className="h-px bg-gray-100" />
            {!isLoading && (
              <div className="flex flex-wrap gap-2">
                <InsightChip level={completionInsight.level}>{completionInsight.text}</InsightChip>
                <InsightChip level={ratioInsight.level}>{ratioInsight.text}</InsightChip>
                <InsightChip level="info">{stats?.appointments} visits logged this month</InsightChip>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <h2 className="font-semibold text-gray-800 text-base mb-4">Quick Actions</h2>
            <div className="flex flex-col gap-3 flex-1">
              {[
                { label: "Add Care Giver",    sub: "Register a new team member",   icon: Users,      path: "/caregivers/new",   style: "bg-primary-600 hover:bg-primary-700 text-white" },
                { label: "Add Care Receiver", sub: "Onboard a new client",         icon: UserCheck,  path: "/carereceivers/new",style: "bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-800" },
                { label: "View Schedule",     sub: "See this week's appointments", icon: Calendar,   path: "/schedule",         style: "bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-800" },
                { label: "Generate Schedule", sub: "Auto-assign care visits",      icon: TrendingUp, path: "/schedule/generate",style: "bg-white border border-gray-200 hover:border-primary-300 hover:bg-primary-50 text-gray-800" },
              ].map(a => (
                <button key={a.label} onClick={() => navigate(a.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left group ${a.style}`}>
                  <a.icon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{a.label}</p>
                    <p className="text-xs opacity-70 mt-0.5 leading-tight">{a.sub}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 opacity-40 group-hover:opacity-70 flex-shrink-0 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* People overview */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 border-b border-gray-100">
            <div className="flex gap-1">
              <button onClick={() => setActiveTab("givers")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors -mb-px ${activeTab === "givers" ? "border-primary-600 text-primary-700 bg-primary-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Award className="h-4 w-4" />
                Care Team Performance
                {!cgLoading && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                    {activeGivers} active
                  </span>
                )}
              </button>
              <button onClick={() => setActiveTab("receivers")}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-colors -mb-px ${activeTab === "receivers" ? "border-primary-600 text-primary-700 bg-primary-50" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                <Heart className="h-4 w-4" />
                Client Loyalty
                {!crLoading && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                    {longTermClients} long-term
                  </span>
                )}
              </button>
            </div>
            <button onClick={() => navigate(activeTab === "givers" ? "/caregivers" : "/carereceivers")}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 pb-2.5">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="p-6">
            {activeTab === "givers" && (
              <CareGiverTable
                careGivers={careGivers}
                carerStats={carerStats}
                isLoading={cgLoading}
                aptsLoading={aptsLoading}
                onNavigate={navigate}
              />
            )}
            {activeTab === "receivers" && (
              <CareReceiverTable
                careReceivers={careReceivers}
                isLoading={crLoading}
                onNavigate={navigate}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

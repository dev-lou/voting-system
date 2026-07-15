import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, FileText, Activity, MapPin, CalendarX, FileX, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import { getAuditLog, clearAuditLog, type AuditEntry } from "../../utils/auditLog";
import type { Election } from "../../lib/types";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Stats {
  totalVoters: number;
  votesCast: number;
  activeSections: number;
  activeElection: Election | null;
}

interface SectionTurnout {
  year_section: string;
  total_voters: number;
  votes_cast: number;
}

export function OverviewPanel({ onGoToAudit }: { onGoToAudit?: () => void }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sections, setSections] = useState<SectionTurnout[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [statsRes, sectionRes, electionRes] = await Promise.all([
        supabase.rpc("admin_get_stats", { p_admin_email: adminEmail }),
        supabase.rpc("admin_get_section_turnout", { p_admin_email: adminEmail }),
        supabase.from("elections").select("*").eq("is_active", true).maybeSingle(),
      ]);

      const statsArray = statsRes.data as Array<{ total_voters: number; votes_cast: number; active_sections: number }> | null;
      const statsData = statsArray?.[0] ?? null;

      setStats({
        totalVoters: statsData?.total_voters ?? 0,
        votesCast: statsData?.votes_cast ?? 0,
        activeSections: statsData?.active_sections ?? 0,
        activeElection: electionRes.data as Election | null,
      });

      setSections((sectionRes.data as SectionTurnout[] | null) ?? []);
    } catch (err) {
      console.error("Failed to load stats:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    setAuditLog(getAuditLog());
  }, []);

  const handleRefreshAudit = () => {
    setAuditLog(getAuditLog());
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="mb-6 h-9 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-1 h-4 w-64 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
        <div className="mb-8 mt-6 grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const participation = stats && stats.totalVoters > 0
    ? Math.round((stats.votesCast / stats.totalVoters) * 100)
    : 0;

  // Pie Chart Data
  const turnoutData = [
    { name: "Voted", value: stats?.votesCast ?? 0 },
    { name: "Pending", value: Math.max(0, (stats?.totalVoters ?? 0) - (stats?.votesCast ?? 0)) }
  ];
  const pieColors = isDark ? ["url(#donutDark)", "#27272a"] : ["url(#donutLight)", "#f4f4f5"]; 

  // Bar Chart Data
  const barData = sections.map(s => ({
    name: s.year_section,
    Turnout: s.total_voters > 0 ? Math.round((s.votes_cast / s.total_voters) * 100) : 0,
  }));

  // Helper Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/90">
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{label}</p>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-emerald-400" />
            <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
              {payload[0].value}% <span className="text-xs font-bold text-zinc-400">Turnout</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-transparent">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Overview</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Real-time analytics and participation metrics
            </p>
          </div>
          <button
            onClick={() => { load(); setAuditLog(getAuditLog()); }}
            disabled={loading}
            className="rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-bold text-zinc-700 shadow-sm transition-all hover:bg-zinc-50 hover:shadow-md disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {loading ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>

        {/* --- 2026 High-End Stat Cards --- */}
        <div className="mb-8 mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          
          {/* Card 1: Total Voters */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-[#09090b] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(59,130,246,0.15)]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-blue-400/20 dark:bg-blue-500/20 blur-3xl transition-all duration-700 group-hover:bg-blue-400/40 dark:group-hover:bg-blue-500/40 group-hover:scale-150" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-3xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Total Voters</p>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/10 group-hover:ring-blue-500/50">
                <Users className="h-6 w-6 text-blue-500 dark:text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)] dark:drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]" strokeWidth={2} />
              </div>
            </div>
            <p className="relative z-10 mt-8 text-6xl font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              {stats?.totalVoters ?? 0}
            </p>
          </div>

          {/* Card 2: Votes Cast */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-[#09090b] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(168,85,247,0.15)]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-purple-400/20 dark:bg-purple-500/20 blur-3xl transition-all duration-700 group-hover:bg-purple-400/40 dark:group-hover:bg-purple-500/40 group-hover:scale-150" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-fuchsia-500/10 dark:bg-fuchsia-600/10 blur-3xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Votes Cast</p>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/10 group-hover:ring-purple-500/50">
                <FileText className="h-6 w-6 text-purple-500 dark:text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.4)] dark:drop-shadow-[0_0_8px_rgba(192,132,252,0.8)]" strokeWidth={2} />
              </div>
            </div>
            <p className="relative z-10 mt-8 text-6xl font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              {stats?.votesCast ?? 0}
            </p>
          </div>

          {/* Card 3: Turnout */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-[#09090b] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(16,185,129,0.15)]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-400/20 dark:bg-emerald-500/20 blur-3xl transition-all duration-700 group-hover:bg-emerald-400/40 dark:group-hover:bg-emerald-500/40 group-hover:scale-150" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-teal-500/10 dark:bg-teal-600/10 blur-3xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Turnout Rate</p>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/10 group-hover:ring-emerald-500/50">
                <Activity className="h-6 w-6 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] dark:drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]" strokeWidth={2} />
              </div>
            </div>
            <div className="relative z-10 mt-8 flex items-baseline gap-2">
              <p className="text-6xl font-black tracking-tighter text-zinc-900 dark:text-transparent dark:bg-clip-text dark:bg-gradient-to-br dark:from-white dark:to-zinc-400 drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
                {participation}%
              </p>
              <ArrowUpRight className="h-8 w-8 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)] dark:drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]" strokeWidth={3} />
            </div>
          </div>

          {/* Card 4: Sections */}
          <div className="group relative overflow-hidden rounded-[2rem] bg-white/60 dark:bg-[#09090b] p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-3xl transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(249,115,22,0.15)]">
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-orange-400/20 dark:bg-orange-500/20 blur-3xl transition-all duration-700 group-hover:bg-orange-400/40 dark:group-hover:bg-orange-500/40 group-hover:scale-150" />
            <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-amber-500/10 dark:bg-amber-600/10 blur-3xl" />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] dark:opacity-[0.03] mix-blend-overlay" />
            
            <div className="relative z-10 flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">Active Sections</p>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/40 dark:bg-white/5 ring-1 ring-zinc-200/50 dark:ring-white/10 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:bg-white/60 dark:group-hover:bg-white/10 group-hover:ring-orange-500/50">
                <MapPin className="h-6 w-6 text-orange-500 dark:text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)] dark:drop-shadow-[0_0_8px_rgba(251,146,60,0.8)]" strokeWidth={2} />
              </div>
            </div>
            <p className="relative z-10 mt-8 text-6xl font-black tracking-tighter text-zinc-900 dark:text-white drop-shadow-sm dark:drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              {stats?.activeSections ?? 0}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Turnout Donut Chart */}
          <div className="col-span-1 flex flex-col rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 relative">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Participation Donut</h3>
            <div className="relative flex-1 flex items-center justify-center min-h-[250px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <linearGradient id="donutLight" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                    <linearGradient id="donutDark" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#3b82f6" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={turnoutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={12}
                  >
                    {turnoutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} 
                            style={index === 0 && isDark ? { filter: 'drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.4))' } : {}} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} cursor={false} />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Text inside Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-4xl font-black text-zinc-900 dark:text-white drop-shadow-sm">{participation}%</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mt-1">Voted</span>
              </div>
            </div>
          </div>

          {/* Section Bar Chart */}
          <div className="col-span-1 lg:col-span-2 rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 relative">
            <div className="mb-8 flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                Turnout Heatmap by Section
              </h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="barLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="barDark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                    </linearGradient>
                    <linearGradient id="barCompleteLight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.8} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: isDark ? '#71717a' : '#a1a1aa' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: isDark ? '#71717a' : '#a1a1aa' }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }} />
                  <Bar dataKey="Turnout" radius={[8, 8, 8, 8]} barSize={32}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.Turnout >= 100 ? (isDark ? 'url(#barDark)' : 'url(#barCompleteLight)') : (isDark ? 'url(#barDark)' : 'url(#barLight)')} 
                            style={isDark ? { filter: `drop-shadow(0px 0px 8px ${entry.Turnout >= 100 ? 'rgba(16,185,129,0.3)' : 'rgba(16,185,129,0.2)'})` } : {}} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 pb-8">
           {/* Current Election Card */}
           <div className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-6">Current Election Event</p>
            {stats?.activeElection ? (
              <div className="mt-4 flex flex-col justify-between h-[calc(100%-2rem)]">
                <div>
                  <p className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{stats.activeElection.name}</p>
                  <p className="mt-2 flex items-center text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    <Clock className="mr-2 h-4 w-4" />
                    {stats.activeElection.starts_at ? new Date(stats.activeElection.starts_at).toLocaleDateString() : 'Dates not set'}
                    <span className="mx-3 text-zinc-300 dark:text-zinc-700">—</span>
                    {stats.activeElection.ends_at ? new Date(stats.activeElection.ends_at).toLocaleDateString() : 'Dates not set'}
                  </p>
                </div>
                <div className="mt-8 flex justify-start">
                  <span className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 ring-1 ring-emerald-500/30">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    System Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 opacity-50">
                <CalendarX className="mb-4 h-12 w-12 text-zinc-400 dark:text-zinc-600" strokeWidth={1} />
                <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">No active election</p>
              </div>
            )}
          </div>

          {/* Audit Log / Transaction History */}
          <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-100 px-8 py-6 dark:border-white/5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">Activity History</h3>
              <div className="flex gap-2">
                {onGoToAudit && auditLog.length > 0 && (
                  <button
                    onClick={onGoToAudit}
                    className="rounded-lg px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 transition-colors hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer"
                  >
                    See More
                  </button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden p-2">
              {auditLog.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 opacity-50">
                  <FileX className="mb-4 h-10 w-10 text-zinc-400 dark:text-zinc-600" strokeWidth={1} />
                  <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">No actions recorded</p>
                </div>
              ) : (
                <div className="h-full max-h-[300px] overflow-y-auto scrollbar-thin px-2 pb-2">
                  <div className="space-y-1">
                    {auditLog.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between rounded-2xl p-3 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900">
                            <span className="text-xs font-black text-zinc-500 dark:text-zinc-400">{entry.actor.substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{entry.action}</p>
                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 line-clamp-1">{entry.details}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">
                            {new Date(entry.timestamp).toLocaleDateString()}
                          </p>
                          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

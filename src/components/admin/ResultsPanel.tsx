import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election, ResultRow } from "../../lib/types";
import { CustomSelect } from "../CustomSelect";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface PositionResult {
  position_id: string;
  position_title: string;
  display_order: number;
  total: number;
  candidates: ResultRow[];
}

const POLL_INTERVAL_MS = 15_000;

export function ResultsPanel() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [positions, setPositions] = useState<PositionResult[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votesCast, setVotesCast] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkDark = () => setIsDark(document.documentElement.classList.contains("dark"));
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setElections(data ?? []);
        if (data && data.length > 0) {
          const active = data.find((e) => e.is_active);
          setSelectedElectionId(active?.id ?? data[0].id);
        }
        setLoadingElections(false);
      });
  }, []);

  const fetchResults = useCallback(() => {
    if (!selectedElectionId) return;

    setLoadingResults(true);
    setError(null);

    Promise.all([
      supabase.rpc("admin_get_stats", { p_admin_email: adminEmail }),
      supabase.rpc("get_results", { p_election_id: selectedElectionId }),
    ]).then(([statsRes, resultsRes]) => {
      const statsArr = statsRes.data as Array<{ total_voters: number; votes_cast: number }> | null;
      const stats = statsArr?.[0];
      if (stats) {
        setTotalVoters(stats.total_voters);
        setVotesCast(stats.votes_cast);
      }

      const err = resultsRes.error as { message: string } | null;
      if (err) {
        setError(err.message);
      } else {
        const rows: ResultRow[] = (resultsRes.data ?? []) as ResultRow[];
        const map = new Map<string, PositionResult>();
        for (const row of rows) {
          if (!map.has(row.position_id)) {
            map.set(row.position_id, {
              position_id: row.position_id,
              position_title: row.position_title,
              display_order: row.display_order,
              total: 0,
              candidates: [],
            });
          }
          const pos = map.get(row.position_id)!;
          pos.candidates.push(row);
          pos.total += Number(row.vote_count);
        }
        setPositions(Array.from(map.values()).sort((a, b) => a.display_order - b.display_order));
      }
      setLastUpdated(new Date());
      setLoadingResults(false);
    }).catch(() => {
      setLoadingResults(false);
    });
  }, [selectedElectionId, adminEmail]);

  useEffect(() => {
    if (!selectedElectionId) return;
    fetchResults();

    pollRef.current = setInterval(fetchResults, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [selectedElectionId, fetchResults]);

  function exportCSV() {
    const rows: string[][] = [["Position", "Candidate", "Party", "Votes", "Percentage"]];
    for (const pos of positions) {
      const pct = (v: number) => (pos.total > 0 ? ((v / pos.total) * 100).toFixed(1) + "%" : "0%");
      for (const c of pos.candidates) {
        rows.push([
          pos.position_title,
          c.candidate_name,
          c.party ?? "",
          String(c.vote_count),
          pct(Number(c.vote_count)),
        ]);
      }
    }
    rows.push([]);
    rows.push(["Turnout", `${votesCast} / ${totalVoters}`, `(${turnoutPct}%)`]);

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const electionName = elections.find((e) => e.id === selectedElectionId)?.name ?? "results";
    a.download = `${electionName.replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const turnoutPct = totalVoters > 0 ? Math.round((votesCast / totalVoters) * 100) : 0;

  const turnoutData = [
    { name: "Voted", value: votesCast },
    { name: "Pending", value: Math.max(0, totalVoters - votesCast) }
  ];
  const pieColors = isDark ? ["#10b981", "#27272a"] : ["#3b82f6", "#e4e4e7"]; 

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-zinc-200 bg-white/80 p-3 shadow-xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80">
          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">
            {payload[0].name}: <span className="text-blue-500 dark:text-emerald-400">{payload[0].value} voters</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-zinc-50/50 dark:bg-[#09090b]">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-200 dark:border-white/5 bg-white/60 backdrop-blur-2xl dark:bg-zinc-950/60 px-8 py-5">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Results</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Live election results and participation tracking
            </p>
          </div>
          {!loadingElections && (
            <div className="w-72 relative z-40 ml-4">
              <CustomSelect
                value={selectedElectionId}
                onChange={setSelectedElectionId}
                options={elections.map((el) => ({ value: el.id, label: el.name }))}
                placeholder="Select Election"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Updated {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={fetchResults}
            disabled={loadingResults}
            className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-700 shadow-sm hover:bg-zinc-50 hover:shadow-md disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-all"
            title="Refresh results"
          >
            <RefreshCw className={`h-4 w-4 ${loadingResults ? "animate-spin" : ""}`} strokeWidth={2} />
            Refresh
          </button>
          {positions.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 rounded-xl border border-transparent bg-maroon-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-maroon-500/30 hover:bg-maroon-700 cursor-pointer dark:bg-maroon-500 dark:hover:bg-maroon-600 transition-all"
              title="Export to CSV"
            >
              <Download className="h-4 w-4" strokeWidth={2} />
              Export
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600 shadow-sm">{error}</div>
        )}
        {loadingResults && (
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Loading results data...</p>
        )}
        {!loadingResults && positions.length === 0 && !error && (
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">No results to display.</p>
        )}

        {/* Turnout Overview */}
        {!loadingResults && positions.length > 0 && (
          <div className="mb-8 flex flex-col sm:flex-row items-center justify-between rounded-3xl bg-white px-10 py-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 relative w-full">
             <div>
               <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2">Live Turnout</h3>
               <div className="mt-4">
                 <p className="text-4xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">{votesCast} <span className="text-lg font-medium text-zinc-500">/ {totalVoters}</span></p>
                 <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mt-2">Total Votes Cast</p>
               </div>
             </div>
             <div className="relative h-40 w-40">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={turnoutData}
                     cx="50%"
                     cy="50%"
                     innerRadius={55}
                     outerRadius={75}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                     cornerRadius={10}
                   >
                     {turnoutData.map((_, index) => (
                       <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} 
                             style={index === 0 && isDark ? { filter: 'drop-shadow(0px 0px 8px rgba(16, 185, 129, 0.4))' } : {}} />
                     ))}
                   </Pie>
                   <Tooltip content={<CustomTooltip />} cursor={false} />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                 <span className="text-2xl font-black text-zinc-900 dark:text-white drop-shadow-sm">{turnoutPct}%</span>
               </div>
             </div>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
          {positions.map((pos, posIdx) => {
            const colorProfiles = [
              { bg: "bg-gradient-to-br from-amber-400 to-amber-600", shadow: "shadow-amber-500/30", textDark: "dark:text-amber-400", barBg: "bg-gradient-to-r from-amber-400 to-amber-500", barShadow: "dark:shadow-[0_0_12px_rgba(251,191,36,0.6)]" },
              { bg: "bg-gradient-to-br from-cyan-400 to-cyan-600", shadow: "shadow-cyan-500/30", textDark: "dark:text-cyan-400", barBg: "bg-gradient-to-r from-cyan-400 to-cyan-500", barShadow: "dark:shadow-[0_0_12px_rgba(34,211,238,0.6)]" },
              { bg: "bg-gradient-to-br from-emerald-400 to-emerald-600", shadow: "shadow-emerald-500/30", textDark: "dark:text-emerald-400", barBg: "bg-gradient-to-r from-emerald-400 to-emerald-500", barShadow: "dark:shadow-[0_0_12px_rgba(52,211,153,0.6)]" },
              { bg: "bg-gradient-to-br from-fuchsia-400 to-fuchsia-600", shadow: "shadow-fuchsia-500/30", textDark: "dark:text-fuchsia-400", barBg: "bg-gradient-to-r from-fuchsia-400 to-fuchsia-500", barShadow: "dark:shadow-[0_0_12px_rgba(232,121,249,0.6)]" },
              { bg: "bg-gradient-to-br from-rose-400 to-rose-600", shadow: "shadow-rose-500/30", textDark: "dark:text-rose-400", barBg: "bg-gradient-to-r from-rose-400 to-rose-500", barShadow: "dark:shadow-[0_0_12px_rgba(244,63,94,0.6)]" },
              { bg: "bg-gradient-to-br from-indigo-400 to-indigo-600", shadow: "shadow-indigo-500/30", textDark: "dark:text-indigo-400", barBg: "bg-gradient-to-r from-indigo-400 to-indigo-500", barShadow: "dark:shadow-[0_0_12px_rgba(129,140,248,0.6)]" },
              { bg: "bg-gradient-to-br from-orange-400 to-orange-600", shadow: "shadow-orange-500/30", textDark: "dark:text-orange-400", barBg: "bg-gradient-to-r from-orange-400 to-orange-500", barShadow: "dark:shadow-[0_0_12px_rgba(251,146,60,0.6)]" },
              { bg: "bg-gradient-to-br from-teal-400 to-teal-600", shadow: "shadow-teal-500/30", textDark: "dark:text-teal-400", barBg: "bg-gradient-to-r from-teal-400 to-teal-500", barShadow: "dark:shadow-[0_0_12px_rgba(45,212,191,0.6)]" },
              { bg: "bg-gradient-to-br from-violet-400 to-violet-600", shadow: "shadow-violet-500/30", textDark: "dark:text-violet-400", barBg: "bg-gradient-to-r from-violet-400 to-violet-500", barShadow: "dark:shadow-[0_0_12px_rgba(167,139,250,0.6)]" },
              { bg: "bg-gradient-to-br from-lime-400 to-lime-600", shadow: "shadow-lime-500/30", textDark: "dark:text-lime-400", barBg: "bg-gradient-to-r from-lime-400 to-lime-500", barShadow: "dark:shadow-[0_0_12px_rgba(163,230,53,0.6)]" },
              { bg: "bg-gradient-to-br from-blue-400 to-blue-600", shadow: "shadow-blue-500/30", textDark: "dark:text-blue-400", barBg: "bg-gradient-to-r from-blue-400 to-blue-500", barShadow: "dark:shadow-[0_0_12px_rgba(96,165,250,0.6)]" },
              { bg: "bg-gradient-to-br from-red-400 to-red-600", shadow: "shadow-red-500/30", textDark: "dark:text-red-400", barBg: "bg-gradient-to-r from-red-400 to-red-500", barShadow: "dark:shadow-[0_0_12px_rgba(248,113,113,0.6)]" },
              { bg: "bg-gradient-to-br from-purple-400 to-purple-600", shadow: "shadow-purple-500/30", textDark: "dark:text-purple-400", barBg: "bg-gradient-to-r from-purple-400 to-purple-500", barShadow: "dark:shadow-[0_0_12px_rgba(192,132,252,0.6)]" },
              { bg: "bg-gradient-to-br from-pink-400 to-pink-600", shadow: "shadow-pink-500/30", textDark: "dark:text-pink-400", barBg: "bg-gradient-to-r from-pink-400 to-pink-500", barShadow: "dark:shadow-[0_0_12px_rgba(244,114,182,0.6)]" },
              { bg: "bg-gradient-to-br from-yellow-400 to-yellow-600", shadow: "shadow-yellow-500/30", textDark: "dark:text-yellow-400", barBg: "bg-gradient-to-r from-yellow-400 to-yellow-500", barShadow: "dark:shadow-[0_0_12px_rgba(250,204,21,0.6)]" }
            ];
            const profile = colorProfiles[posIdx % colorProfiles.length];

            return (
            <div
              key={pos.position_id}
              className="rounded-3xl bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 transition-all"
            >
              <div className="mb-8 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 pb-4">
                <p className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100">
                  {pos.position_title}
                </p>
                <div className="flex items-center gap-4">
                  <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-3 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400">
                    {pos.total} vote{pos.total !== 1 ? "s" : ""}
                  </span>
                  {votesCast > 0 && Math.max(0, votesCast - pos.total) > 0 && (
                    <span className="rounded-full bg-orange-50 dark:bg-orange-500/10 px-3 py-1 text-xs font-bold text-orange-600 dark:text-orange-400">
                      {Math.max(0, votesCast - pos.total)} abstained
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {pos.candidates.map((c, idx) => {
                  const pct = pos.total > 0 ? Math.round((Number(c.vote_count) / pos.total) * 100) : 0;
                  const isLeader = Number(c.vote_count) > 0 && Number(c.vote_count) === Math.max(...pos.candidates.map((x) => Number(x.vote_count)));

                  return (
                    <div key={c.candidate_id} className="group relative rounded-2xl border border-zinc-100 bg-white p-5 dark:border-white/5 dark:bg-zinc-900/40 shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center gap-5">
                        {isLeader ? (
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${profile.bg} shadow-lg ${profile.shadow} text-white font-black text-base`}>
                            1
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-500 font-bold text-base">
                            {idx + 1}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className={`block font-black text-lg tracking-tight ${isLeader ? `text-zinc-900 ${profile.textDark}` : "text-zinc-700 dark:text-zinc-300"}`}>
                                {c.candidate_name}
                              </span>
                              {c.party && (
                                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                  {c.party}
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="block text-xl font-black tracking-tighter text-zinc-900 dark:text-zinc-100">
                                {c.vote_count}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">Votes</span>
                            </div>
                          </div>
                          
                          {/* Premium Bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800 shadow-inner">
                              <motion.div
                                className={`h-full rounded-full transition-all ${
                                  isLeader
                                    ? `${profile.barBg} ${profile.barShadow}`
                                    : "bg-zinc-300 dark:bg-zinc-600"
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, ease: "easeOut", delay: idx * 0.1 }}
                              />
                            </div>
                            <span className="w-10 text-right text-xs font-black text-zinc-500 dark:text-zinc-400">{pct}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

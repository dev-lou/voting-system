import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { getAuditLog, clearAuditLog, type AuditEntry } from "../../utils/auditLog";
import type { Election } from "../../lib/types";

interface Stats {
  totalVoters: number;
  votesCast: number;
  activeElection: Election | null;
}

export function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  async function load() {
    setLoading(true);
    try {
      const [votersRes, votedRes, electionRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("students").select("id", { count: "exact", head: true }).eq("has_voted", true),
        supabase.from("elections").select("*").eq("is_active", true).maybeSingle(),
      ]);

      setStats({
        totalVoters: votersRes.count ?? 0,
        votesCast: votedRes.count ?? 0,
        activeElection: electionRes.data,
      });
    } catch {
      // Silent fail
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
        <div className="mb-8 mt-6 grid grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
          ))}
        </div>
        <div className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  const participation = stats && stats.totalVoters > 0
    ? Math.round((stats.votesCast / stats.totalVoters) * 100)
    : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Dashboard</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Monitor voting activity and system status
            </p>
          </div>
          <button
            onClick={() => { load(); setAuditLog(getAuditLog()); }}
            disabled={loading}
            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 cursor-pointer dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 mt-6 grid grid-cols-3 gap-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Voters</p>
            <p className="mt-2 text-5xl font-bold text-zinc-900 dark:text-zinc-100">{stats?.totalVoters ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Votes Cast</p>
            <p className="mt-2 text-5xl font-bold text-maroon-700 dark:text-maroon-500">{stats?.votesCast ?? 0}</p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Turnout</p>
            <p className="mt-2 text-5xl font-bold text-zinc-900 dark:text-zinc-100">{participation}%</p>
          </div>
        </div>

        {/* Current Election */}
        <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
          <p className="text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Current Election</p>
          {stats?.activeElection ? (
            <div className="mt-3">
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.activeElection.name}</p>
              <p className="mt-1 text-zinc-500 dark:text-zinc-400">
                {stats.activeElection.starts_at && new Date(stats.activeElection.starts_at).toLocaleDateString()}
                {" - "}
                {stats.activeElection.ends_at && new Date(stats.activeElection.ends_at).toLocaleDateString()}
                <span className="ml-3 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700 dark:bg-green-500/20 dark:text-green-400">Active</span>
              </p>
            </div>
          ) : (
            <p className="mt-3 text-zinc-500 dark:text-zinc-400">No active election</p>
          )}
        </div>

        {/* Progress bar */}
        {stats && stats.totalVoters > 0 && (
          <div className="mb-8 h-4 rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div className="h-4 rounded-full bg-maroon-700 transition-all dark:bg-maroon-600" style={{ width: `${participation}%` }} />
          </div>
        )}

        {/* Audit Log */}
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
            <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">Audit Log</h3>
            <div className="flex gap-2">
              <button
                onClick={handleRefreshAudit}
                className="rounded-lg px-4 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 min-h-[44px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                Refresh
              </button>
              {auditLog.length > 0 && (
                <button
                  onClick={() => { clearAuditLog(); setAuditLog([]); }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-50 min-h-[44px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 dark:hover:bg-red-900/20"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {auditLog.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">No actions recorded yet.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
                    <th className="px-6 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actor</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                     <tr key={entry.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200">
                      <td className="whitespace-nowrap px-6 py-3 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{entry.actor}</td>
                      <td className="px-4 py-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">{entry.action}</td>
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400">{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

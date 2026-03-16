import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Election } from "../../lib/types";

interface Stats {
  totalVoters: number;
  votesCast: number;
  activeElection: Election | null;
}

export function OverviewPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      } catch (e) {
        // Silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">Loading dashboard...</p>
      </div>
    );
  }

  const participation = stats && stats.totalVoters > 0
    ? Math.round((stats.votesCast / stats.totalVoters) * 100)
    : 0;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-6">Dashboard</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Total Voters</p>
          <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{stats?.totalVoters ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Votes Cast</p>
          <p className="text-4xl font-bold text-maroon-700 mt-2">{stats?.votesCast ?? 0}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm">
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">Turnout</p>
          <p className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{participation}%</p>
        </div>
      </div>

      {/* Current Election */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 shadow-sm mb-6">
        <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">Current Election</p>
        {stats?.activeElection ? (
          <div className="mt-3">
            <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{stats.activeElection.name}</p>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              {stats.activeElection.starts_at && new Date(stats.activeElection.starts_at).toLocaleDateString()}
              {" - "}
              {stats.activeElection.ends_at && new Date(stats.activeElection.ends_at).toLocaleDateString()}
              <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">Active</span>
            </p>
          </div>
        ) : (
          <p className="mt-3 text-zinc-400 dark:text-zinc-500">No active election</p>
        )}
      </div>

      {/* Progress bar */}
      {stats && stats.totalVoters > 0 && (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded-full h-4 mb-2">
          <div className="bg-maroon-700 h-4 rounded-full transition-all" style={{ width: `${participation}%` }} />
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../lib/supabase";
import type { Election, ResultRow } from "../../lib/types";
import { CustomSelect } from "../CustomSelect";

interface PositionResult {
  position_id: string;
  position_title: string;
  display_order: number;
  total: number;
  candidates: ResultRow[];
}

/**
 * Results panel — election selector + per-position vote count bars.
 * White theme (2026)
 */
export function ResultsPanel() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [positions, setPositions] = useState<PositionResult[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalVoters, setTotalVoters] = useState(0);
  const [votesCast, setVotesCast] = useState(0);

  const isDark = typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';

  // Load elections
  useEffect(() => {
    supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Election[] | null }) => {
        setElections(data ?? []);
        if (data && data.length > 0) {
          const active = data.find((e) => e.is_active);
          setSelectedElectionId(active?.id ?? data[0].id);
        }
        setLoadingElections(false);
      });
  }, []);

  // Load results when election changes
  useEffect(() => {
    if (!selectedElectionId) return;
    setLoadingResults(true);
    setError(null);

    // Fetch turnout data
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .then(({ count }: { count: number | null }) => {
        setTotalVoters(count ?? 0);
      });
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("has_voted", true)
      .then(({ count }: { count: number | null }) => {
        setVotesCast(count ?? 0);
      });

    supabase
      .rpc("get_results", { p_election_id: selectedElectionId })
      .then(({ data, error: err }: { data: ResultRow[] | null; error: { message: string } | null }) => {
        if (err) {
          setError(err.message);
          setLoadingResults(false);
          return;
        }

        const rows: ResultRow[] = (data ?? []) as ResultRow[];

        // Group by position
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

        setPositions(
          Array.from(map.values()).sort((a, b) => a.display_order - b.display_order)
        );
        setLoadingResults(false);
      });
  }, [selectedElectionId]);

  const turnoutPct = totalVoters > 0 ? Math.round((votesCast / totalVoters) * 100) : 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Results</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Live election results and voter turnout
          </p>
        </div>
        {!loadingElections && (
          <div className="w-64 relative z-40">
            <CustomSelect
              value={selectedElectionId}
              onChange={setSelectedElectionId}
              options={elections.map((el) => ({ value: el.id, label: el.name }))}
              placeholder="Select Election"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
        )}
        {loadingResults && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading results...</p>
        )}
        {!loadingResults && positions.length === 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">No results to display.</p>
        )}

        {/* Turnout donut */}
        {!loadingResults && positions.length > 0 && (
          <div className="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-900/50 dark:backdrop-blur-md">
            <div className="flex items-center gap-6">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white dark:bg-zinc-900"
                   style={{ background: isDark
                   ? `conic-gradient(#d63865 0% ${turnoutPct}%, #27272a ${turnoutPct}% 100%)`
                   : `conic-gradient(#800020 0% ${turnoutPct}%, #e4e4e7 ${turnoutPct}% 100%)` }}>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-zinc-900">
                  <span className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{turnoutPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Voter Turnout</p>
                <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{votesCast} / {totalVoters}</p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">registered voters have voted</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {positions.map((pos) => (
            <div
              key={pos.position_id}
              className="rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {pos.position_title}
                </p>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    {pos.total} vote{pos.total !== 1 ? "s" : ""} cast
                  </span>
                  {votesCast > 0 && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {Math.max(0, votesCast - pos.total)} abstained
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {pos.candidates.map((c) => {
                  const pct =
                    pos.total > 0
                      ? Math.round((Number(c.vote_count) / pos.total) * 100)
                      : 0;
                  const isLeader =
                    Number(c.vote_count) ===
                    Math.max(...pos.candidates.map((x) => Number(x.vote_count)));

                  return (
                    <div key={c.candidate_id}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                        <span
                          className={`min-w-0 truncate font-semibold ${
                            isLeader && pos.total > 0
                              ? "text-gold-400"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {isLeader && pos.total > 0 && (
                            <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gold-500 text-[10px] font-bold text-white">
                              1
                            </span>
                          )}
                          {c.candidate_name}
                          {c.party && (
                            <span className="ml-2 font-normal text-zinc-600 dark:text-zinc-400">
                              ({c.party})
                            </span>
                          )}
                        </span>
                        <span className="tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">
                          {c.vote_count} ({pct}%)
                        </span>
                      </div>
                      {/* CSS bar chart */}
                      <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                        <motion.div
                          className={`h-full rounded-full ${
                            isLeader && pos.total > 0
                              ? "bg-gold-500"
                              : "bg-maroon-600"
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

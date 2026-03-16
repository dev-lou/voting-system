import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import type { Election, ResultRow } from "../../lib/types";

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Results</h2>
        {!loadingElections && (
          <select
            value={selectedElectionId}
            onChange={(e) => setSelectedElectionId(e.target.value)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-maroon-500 cursor-pointer"
          >
            {elections.map((el) => (
              <option key={el.id} value={el.id}>{el.name}</option>
            ))}
          </select>
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

        <div className="space-y-6">
          {positions.map((pos) => (
            <div
              key={pos.position_id}
              className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {pos.position_title}
                </p>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {pos.total} vote{pos.total !== 1 ? "s" : ""} cast
                </span>
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
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span
                          className={`font-semibold ${
                            isLeader && pos.total > 0
                              ? "text-gold-400"
                              : "text-zinc-700 dark:text-zinc-300"
                          }`}
                        >
                          {c.candidate_name}
                          {c.party && (
                            <span className="ml-2 font-normal text-zinc-400 dark:text-zinc-500">
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
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isLeader && pos.total > 0
                              ? "bg-gold-500"
                              : "bg-maroon-600"
                          }`}
                          style={{ width: `${pct}%` }}
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

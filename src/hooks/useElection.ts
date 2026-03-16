import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Election, PositionWithCandidates, Candidate } from "../lib/types";

/**
 * Fetches the active election with all its positions and candidates.
 * Returns { election, positions, loading, error }
 */
export function useElection() {
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<PositionWithCandidates[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchElection() {
      setLoading(true);
      setError(null);

      try {
        // 1. Get the active election
        const { data: electionData, error: electionErr } = await supabase
          .from("elections")
          .select("*")
          .eq("is_active", true)
          .limit(1)
          .maybeSingle();

        if (electionErr) throw electionErr;
        if (!electionData) {
          setError("No active election found.");
          setLoading(false);
          return;
        }
        if (cancelled) return;
        setElection(electionData as Election);

        // 2. Get positions ordered by display_order
        const { data: positionsData, error: positionsErr } = await supabase
          .from("positions")
          .select("*")
          .eq("election_id", electionData.id)
          .order("display_order", { ascending: true });

        if (positionsErr) throw positionsErr;
        if (cancelled) return;

        // 3. Get all candidates for these positions
        const positionIds = (positionsData ?? []).map((p) => p.id);
        const { data: candidatesData, error: candidatesErr } = await supabase
          .from("candidates")
          .select("*")
          .in("position_id", positionIds);

        if (candidatesErr) throw candidatesErr;
        if (cancelled) return;

        // 4. Group candidates by position
        const candidatesByPosition = new Map<string, Candidate[]>();
        for (const c of (candidatesData ?? []) as Candidate[]) {
          const existing = candidatesByPosition.get(c.position_id) ?? [];
          existing.push(c);
          candidatesByPosition.set(c.position_id, existing);
        }

        const enrichedPositions: PositionWithCandidates[] = (
          positionsData ?? []
        ).map((p) => ({
          ...(p as PositionWithCandidates),
          candidates: candidatesByPosition.get(p.id) ?? [],
        }));

        setPositions(enrichedPositions);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load election data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchElection();
    return () => {
      cancelled = true;
    };
  }, []);

  return { election, positions, loading, error };
}

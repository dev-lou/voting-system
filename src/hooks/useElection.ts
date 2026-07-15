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
        // First check if there are multiple active elections (shouldn't happen, but guard)
        const { data: allActive, error: countErr } = await supabase
          .from("elections")
          .select("id, name", { count: "exact" })
          .eq("is_active", true);

        if (countErr) throw countErr;

        if (!allActive || allActive.length === 0) {
          setError("No active election found.");
          setLoading(false);
          return;
        }

        if (allActive.length > 1) {
          console.warn(
            "Multiple active elections detected. Using the first one:",
            (allActive as { id: string; name: string }[]).map((e) => e.name).join(", ")
          );
        }

        const { data: electionData, error: electionErr } = await supabase
          .from("elections")
          .select("*")
          .eq("id", allActive[0].id)
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

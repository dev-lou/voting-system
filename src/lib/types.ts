// =============================================================================
// Shared TypeScript types for the voting system
// =============================================================================

export interface Election {
  id: string;
  name: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

export interface Position {
  id: string;
  election_id: string;
  title: string;
  max_votes: number;
  display_order: number;
  created_at: string;
}

export interface Candidate {
  id: string;
  position_id: string;
  full_name: string;
  party: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  full_name: string;
  email: string | null;
  has_voted: boolean;
  created_at: string;
}

export interface Admin {
  id: string;
  email: string;
  created_at: string;
}

/** One row returned by the get_results() RPC */
export interface ResultRow {
  position_id: string;
  position_title: string;
  display_order: number;
  candidate_id: string;
  candidate_name: string;
  party: string | null;
  vote_count: number;
}

/** Admin dashboard navigation sections */
export type AdminSection =
  | "overview"
  | "elections"
  | "positions"
  | "candidates"
  | "voters"
  | "results";

/** A position with its candidates pre-loaded */
export interface PositionWithCandidates extends Position {
  candidates: Candidate[];
}

/** Shape of ballot selections sent to the RPC */
export interface BallotSelection {
  position_id: string;
  candidate_ids: string[];
}

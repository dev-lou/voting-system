import { create } from "zustand";
import type { BallotSelection } from "../lib/types";

interface BallotState {
  /** Map of position_id -> Set of selected candidate_ids */
  selections: Map<string, Set<string>>;

  /** Currently active position index in the sidebar */
  activePositionIndex: number;

  /** Whether the review modal is open */
  showReview: boolean;

  /** Toggle a candidate selection for a position, respecting max_votes */
  toggleCandidate: (
    positionId: string,
    candidateId: string,
    maxVotes: number
  ) => void;

  /** Get the set of selected candidate IDs for a position */
  getSelections: (positionId: string) => Set<string>;

  /** Check if a candidate is selected */
  isSelected: (positionId: string, candidateId: string) => boolean;

  /** Check if the selection limit is reached for a position */
  isLimitReached: (positionId: string, maxVotes: number) => boolean;

  /** Get count of selections for a position */
  getSelectionCount: (positionId: string) => number;

  /** Navigate to a specific position */
  setActivePositionIndex: (index: number) => void;

  /** Toggle review modal */
  setShowReview: (show: boolean) => void;

  /** Build the ballot payload for RPC submission */
  buildBallotPayload: (positionIds: string[]) => BallotSelection[];

  /** Reset all selections (for new voter) */
  reset: () => void;
}

export const useBallotStore = create<BallotState>((set, get) => ({
  selections: new Map(),
  activePositionIndex: 0,
  showReview: false,

  toggleCandidate: (positionId, candidateId, maxVotes) => {
    set((state) => {
      const next = new Map(state.selections);
      const current = new Set(next.get(positionId) ?? []);

      if (current.has(candidateId)) {
        // Deselect
        current.delete(candidateId);
      } else if (current.size < maxVotes) {
        // Select (only if under limit)
        current.add(candidateId);
      }
      // If at limit and trying to add — do nothing (enforced by UI too)

      next.set(positionId, current);
      return { selections: next };
    });
  },

  getSelections: (positionId) => {
    return get().selections.get(positionId) ?? new Set();
  },

  isSelected: (positionId, candidateId) => {
    return get().getSelections(positionId).has(candidateId);
  },

  isLimitReached: (positionId, maxVotes) => {
    return get().getSelections(positionId).size >= maxVotes;
  },

  getSelectionCount: (positionId) => {
    return get().getSelections(positionId).size;
  },

  setActivePositionIndex: (index) => {
    set({ activePositionIndex: index });
  },

  setShowReview: (show) => {
    set({ showReview: show });
  },

  buildBallotPayload: (positionIds) => {
    const { selections } = get();
    return positionIds.map((positionId) => ({
      position_id: positionId,
      candidate_ids: Array.from(selections.get(positionId) ?? []),
    }));
  },

  reset: () => {
    set({
      selections: new Map(),
      activePositionIndex: 0,
      showReview: false,
    });
  },
}));

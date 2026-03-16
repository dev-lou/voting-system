import { useBallotStore } from "../stores/ballotStore";
import { sounds } from "../utils/sounds";
import { motion, AnimatePresence } from "framer-motion";
import type { PositionWithCandidates } from "../lib/types";

interface ReviewModalProps {
  positions: PositionWithCandidates[];
  isOnline: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

/**
 * Review modal — shows all selections before submission.
 * Blocks submission if any position has no selection.
 * Backdrop blur, slide-up entrance, theme-aware.
 */
export function ReviewModal({
  positions,
  isOnline,
  isSubmitting,
  onSubmit,
}: ReviewModalProps) {
  const showReview = useBallotStore((s) => s.showReview);
  const setShowReview = useBallotStore((s) => s.setShowReview);
  const getSelections = useBallotStore((s) => s.getSelections);

  const totalSelections = positions.reduce(
    (sum, pos) => sum + getSelections(pos.id).size,
    0
  );

  // Positions with no selection at all — required to vote
  const unvotedPositions = positions.filter(
    (pos) => getSelections(pos.id).size === 0
  );
  const allPositionsVoted = unvotedPositions.length === 0;
  const canSubmit = isOnline && !isSubmitting && allPositionsVoted;

  const handleClose = () => {
    sounds.playClick();
    setShowReview(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    sounds.playSubmit();
    onSubmit();
  };

  return (
    <AnimatePresence>
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm dark:bg-black/60"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 bg-maroon-700 px-6 py-4 dark:border-zinc-700">
              <div>
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  Review Your Ballot
                </h3>
                <p className="mt-0.5 text-xs text-maroon-200">
                  Please review your selections before submitting
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-50 cursor-pointer"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Missing selections warning */}
            <AnimatePresence>
              {!allPositionsVoted && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="border-b border-amber-200 bg-amber-50 px-6 py-3 dark:border-amber-800/40 dark:bg-amber-900/20"
                >
                  <div className="flex items-start gap-2">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <div>
                      <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                        You must vote for all positions before submitting.
                      </p>
                      <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-500">
                        Missing:{" "}
                        {unvotedPositions.map((p) => p.title).join(", ")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selections */}
            <div className="max-h-80 overflow-y-auto p-6 scrollbar-thin">
              {positions.map((pos) => {
                const selected = getSelections(pos.id);
                const selectedCandidates = pos.candidates.filter((c) =>
                  selected.has(c.id)
                );
                const isEmpty = selected.size === 0;

                return (
                  <div key={pos.id} className="mb-5 last:mb-0">
                    <div className="mb-2 flex items-center gap-2">
                      {isEmpty && (
                        <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                          <svg className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008v.008H12v-.008Z" />
                          </svg>
                        </div>
                      )}
                      <h4 className={`text-xs font-semibold uppercase tracking-wider ${isEmpty ? "text-amber-600 dark:text-amber-400" : "text-zinc-400 dark:text-zinc-500"}`}>
                        {pos.title}
                      </h4>
                      <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">
                        {selected.size}/{pos.max_votes}
                      </span>
                      {isEmpty && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Required
                        </span>
                      )}
                    </div>

                    {selectedCandidates.length > 0 ? (
                      <div className="space-y-1.5">
                        {selectedCandidates.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-3 rounded-lg border border-maroon-200 bg-maroon-50 px-4 py-3 dark:border-maroon-700 dark:bg-maroon-900/30"
                          >
                            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-maroon-700 text-white dark:bg-maroon-600">
                              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                {c.full_name}
                              </span>
                              {c.party && (
                                <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">
                                  {c.party}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-4 py-3 dark:border-amber-800/30 dark:bg-amber-900/10">
                        <p className="text-sm text-amber-600 dark:text-amber-500">
                          No selection — please go back and vote for this position.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-maroon-700 dark:text-maroon-500">{totalSelections}</span>
                {" "}selection{totalSelections !== 1 ? "s" : ""} across {positions.length} position{positions.length !== 1 ? "s" : ""}
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  title={!allPositionsVoted ? "You must vote for all positions before submitting" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-semibold transition-colors duration-150 ${
                    canSubmit
                      ? "bg-maroon-700 text-white hover:bg-maroon-800 dark:bg-maroon-600 dark:hover:bg-maroon-700 cursor-pointer"
                      : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-700 dark:text-zinc-500"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Ballot
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

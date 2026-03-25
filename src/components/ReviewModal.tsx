import { useEffect } from "react";
import { useBallotStore } from "../stores/ballotStore";
import { sounds } from "../utils/sounds";
import { motion, AnimatePresence } from "framer-motion";
import type { PositionWithCandidates } from "../lib/types";

interface ReviewModalProps {
  positions: PositionWithCandidates[];
  isOnline: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  abstainedPositions?: Set<string>;
}

/**
 * 2026 Premium Review Modal
 * Immersive glassmorphism overlay with advanced Framer Motion choreography.
 */
export function ReviewModal({
  positions,
  isOnline,
  isSubmitting,
  onSubmit,
  abstainedPositions,
}: ReviewModalProps) {
  const showReview = useBallotStore((s) => s.showReview);
  const setShowReview = useBallotStore((s) => s.setShowReview);
  const getSelections = useBallotStore((s) => s.getSelections);

  const totalSelections = positions.reduce(
    (sum, pos) => sum + getSelections(pos.id).size,
    0
  );

  const unvotedPositions = positions.filter(
    (pos) => getSelections(pos.id).size === 0 && !(abstainedPositions?.has(pos.id) ?? false)
  );
  const hasUnvoted = unvotedPositions.length > 0;
  const canSubmit = isOnline && !isSubmitting;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showReview) {
        sounds.playClick();
        setShowReview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReview, setShowReview]);

  const handleClose = () => {
    sounds.playClick();
    setShowReview(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    sounds.playSubmit();
    onSubmit();
  };

  // Animation variants
  const backdropVariants: any = {
    hidden: { opacity: 0, backdropFilter: "blur(0px)" },
    visible: { opacity: 1, backdropFilter: "blur(16px)", transition: { duration: 0.4 } },
  };

  const modalVariants: any = {
    hidden: { opacity: 0, y: 40, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30, delay: 0.1 } },
    exit: { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }
  };

  const listVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <AnimatePresence>
      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-12 overflow-hidden">
          {/* Immersive Blur Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute inset-0 bg-zinc-500/30 dark:bg-black/70 backdrop-blur-md"
            onClick={handleClose}
          />

          {/* Premium Glass Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-3xl max-h-full flex flex-col overflow-hidden rounded-[2rem] glass-panel border border-white/20 dark:border-white/10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)]"
          >
            {/* Ambient Modal Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-maroon-500/20 rounded-full blur-[100px] pointer-events-none" />
            
            {/* Header */}
            <div className="relative flex items-center justify-between border-b border-white/20 dark:border-white/5 bg-white/40 dark:bg-zinc-900/40 px-8 py-6 backdrop-blur-md z-10">
              <div>
                <h3 className="text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400">
                  Ballot Review
                </h3>
                <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Final verification of your 2026 selections
                </p>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close review modal"
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 transition-all hover:bg-white hover:text-maroon-600 dark:hover:bg-zinc-700 hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer shadow-sm border border-white/40 dark:border-white/10"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Warning Banner */}
            <AnimatePresence>
              {hasUnvoted && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative z-10 shrink-0"
                >
                  <div className="bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-b border-amber-500/20 px-8 py-4 backdrop-blur-md flex items-start gap-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">Missing Selections</h4>
                      <p className="text-xs font-medium text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed break-words whitespace-normal">
                        You haven't selected anyone for: <span className="font-bold">{unvotedPositions.map(p => p.title).join(", ")}</span>. These will be recorded as abstained.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ─── Selections List ─── */}
            <div className="relative z-10 flex-1 overflow-y-auto p-8 scrollbar-thin">
              <motion.div variants={listVariants} initial="hidden" animate="visible" className="flex flex-col gap-8">
                {positions.map((pos) => {
                  const selected = getSelections(pos.id);
                  const selectedCandidates = pos.candidates.filter((c) => selected.has(c.id));
                  const isEmpty = selected.size === 0;
                  const isAbstained = abstainedPositions?.has(pos.id) ?? false;

                  return (
                    <motion.div key={pos.id} variants={itemVariants} className="relative">
                      {/* Position Header */}
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isEmpty && !isAbstained && (
                            <div className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)] animate-pulse-dot" />
                          )}
                          <h4 className="text-sm font-bold uppercase tracking-widest text-zinc-800 dark:text-zinc-200">
                            {pos.title}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-px w-12 bg-zinc-200 dark:bg-zinc-700 hidden sm:block"></div>
                          <span className="font-mono text-[11px] font-bold text-zinc-400 dark:text-zinc-500">
                            {selected.size} / {pos.max_votes}
                          </span>
                        </div>
                      </div>

                      {/* Candidates or Empty State */}
                      {selectedCandidates.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedCandidates.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-4 rounded-xl border border-white/40 bg-white/60 px-4 py-3 shadow-sm dark:border-white/10 dark:bg-zinc-800/60 backdrop-blur-md transition-transform hover:scale-[1.02]"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-maroon-500 to-maroon-700 text-white shadow-md">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="block text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                  {c.full_name}
                                </span>
                                {c.party && (
                                  <span className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                    {c.party}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : isAbstained ? (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white/30 px-6 py-6 dark:border-zinc-700 dark:bg-zinc-900/30">
                          <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
                            Abstained by Choice
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-amber-300 bg-amber-500/5 px-6 py-6 dark:border-amber-700 dark:bg-amber-900/10">
                          <p className="text-sm font-semibold uppercase tracking-widest text-amber-500/80 dark:text-amber-600/60">
                            No Action Taken
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>

            {/* ─── Premium Footer ─── */}
            <div className="relative z-20 flex items-center justify-between border-t border-white/20 bg-white/50 px-8 py-6 dark:border-white/5 dark:bg-zinc-900/50 backdrop-blur-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-1">
                  Ballot Status
                </p>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  <span className="font-extrabold text-maroon-600 dark:text-maroon-400 text-lg">{totalSelections}</span>
                  {" "}Selections Made
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="rounded-xl border border-zinc-200/50 bg-white/50 px-6 py-3.5 text-sm font-bold text-zinc-700 transition-all hover:bg-zinc-100 hover:scale-105 active:scale-95 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300 hover:dark:bg-zinc-800 shadow-sm cursor-pointer"
                >
                  Edit Ballot
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`relative flex items-center gap-2 rounded-xl px-8 py-3.5 text-sm font-extrabold transition-all duration-300 overflow-hidden shadow-lg ${
                    canSubmit
                      ? "bg-gradient-to-r from-maroon-600 to-maroon-500 text-white hover:scale-105 active:scale-95 glow-maroon cursor-pointer group"
                      : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                  }`}
                >
                  {/* Sweep animation on hover */}
                  {canSubmit && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[sweep_1s_ease-in-out_infinite]" />
                  )}
                  
                  {isSubmitting ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Final Ballot
                      <svg className="h-5 w-5 ml-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
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

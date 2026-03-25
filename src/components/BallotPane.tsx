import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useBallotStore } from "../stores/ballotStore";
import { CandidateCard } from "./CandidateCard";
import { sounds } from "../utils/sounds";
import type { PositionWithCandidates } from "../lib/types";

interface BallotPaneProps {
  positions: PositionWithCandidates[];
  isOnline: boolean;
  abstainedPositions?: Set<string>;
  onAbstain?: (positionId: string) => void;
}

/**
 * Core voting panel without sidebar.
 * Layout: Header > Grid > Dynamic Glass Navigation Pill.
 */
export function BallotPane({
  positions,
  isOnline,
  abstainedPositions,
  onAbstain,
}: BallotPaneProps) {
  const activeIndex = useBallotStore((s) => s.activePositionIndex);
  const setActiveIndex = useBallotStore((s) => s.setActivePositionIndex);
  const setShowReview = useBallotStore((s) => s.setShowReview);
  const getSelectionCount = useBallotStore((s) => s.getSelectionCount);

  useEffect(() => {
    if (!isOnline) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && activeIndex > 0) {
        sounds.playClick();
        setActiveIndex(activeIndex - 1);
      } else if (e.key === 'ArrowRight' && activeIndex < positions.length - 1) {
        sounds.playClick();
        setActiveIndex(activeIndex + 1);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeIndex, isOnline, positions.length, setActiveIndex]);

  const position = positions[activeIndex];

  if (!position) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 dark:text-zinc-400 font-medium tracking-widest uppercase">
        No positions available.
      </div>
    );
  }

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === positions.length - 1;
  const candidateCount = position.candidates.length;
  const isAbstained = (abstainedPositions?.has(position.id) ?? false) && getSelectionCount(position.id) === 0;

  const handlePrevious = () => {
    if (!isFirst) {
      sounds.playClick();
      setActiveIndex(activeIndex - 1);
    }
  };

  const handleNext = () => {
    if (!isLast) {
      sounds.playClick();
      setActiveIndex(activeIndex + 1);
    }
  };

  const handleReview = () => {
    sounds.playSubmit();
    setShowReview(true);
  };

  // Grid columns based on candidate count
  const gridClass =
    candidateCount <= 2
      ? "grid-cols-1 sm:grid-cols-2 max-w-4xl"
      : candidateCount <= 4
        ? "grid-cols-2 lg:grid-cols-3 max-w-6xl"
        : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl";

  return (
    <div className="flex flex-1 flex-col overflow-hidden relative">
      {/* ─── Position Header (Glass) ─── */}
      <div className="shrink-0 glass-panel border-x-0 border-t-0 px-10 py-8 z-10 backdrop-blur-3xl bg-white/40 dark:bg-zinc-950/40">
        <AnimatePresence mode="wait">
          <motion.div
            key={position.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <div className="flex items-end justify-between">
              <div>
                <motion.h2 
                  layoutId="position-title"
                  className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-zinc-100 dark:to-zinc-500 drop-shadow-sm pb-1"
                >
                  {position.title}
                </motion.h2>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-px w-8 bg-maroon-500"></div>
                  <span className="text-sm font-semibold uppercase tracking-widest text-maroon-600 dark:text-maroon-400">
                    Select up to {position.max_votes}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {isAbstained && (
                  <motion.span 
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                    className="text-[11px] uppercase tracking-widest font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-200/50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-full"
                  >
                    No selection
                  </motion.span>
                )}
                <button
                  onClick={() => onAbstain?.(position.id)}
                  disabled={!isOnline}
                  aria-pressed={isAbstained}
                  className={`group flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-bold transition-all duration-300 shadow-sm cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 ${
                    isAbstained
                      ? "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 ring-2 ring-zinc-200 dark:ring-zinc-700"
                      : "glass-panel text-zinc-600 hover:text-maroon-600 hover:border-maroon-500/30 hover:glow-maroon dark:text-zinc-300 dark:hover:text-white"
                  }`}
                >
                  <svg className={`h-4 w-4 transition-transform group-hover:scale-110 ${isAbstained ? 'text-zinc-500' : 'text-current'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                  {isAbstained ? "Abstaining" : "Abstain"}
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Candidate Grid ─── */}
      <div className="flex-1 overflow-y-auto p-10 scrollbar-thin z-0 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={position.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2, staggerChildren: 0.1 }}
            className={`mx-auto grid ${gridClass} gap-8 ${isAbstained ? 'opacity-40 grayscale-[30%] pointer-events-none' : ''}`}
          >
            {position.candidates.map((candidate, idx) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                positionId={position.id}
                maxVotes={position.max_votes}
                isOnline={isOnline}
                index={idx}
              />
            ))}
          </motion.div>
        </AnimatePresence>

        {candidateCount === 0 && (
          <div className="flex flex-col items-center justify-center py-32 text-zinc-400 dark:text-zinc-600">
            <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium tracking-tight">No candidates for this position</p>
          </div>
        )}
      </div>

      {/* ─── Floating Dynamic Navigation Pill ─── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25, delay: 0.2 }}
          className="glass-pill flex items-center gap-6 px-3 py-3 rounded-2xl border-white/40 dark:border-white/10"
        >
          {/* Previous */}
          <button
            disabled={isFirst || !isOnline}
            onClick={handlePrevious}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isFirst && isOnline && handlePrevious()}
            aria-label="Previous position"
            className={`
              flex items-center justify-center rounded-xl px-5 py-3 text-sm font-bold transition-all duration-300
              ${isFirst || !isOnline
                ? "text-zinc-400/50 dark:text-zinc-600/50 cursor-not-allowed"
                : "bg-white/50 text-zinc-800 shadow-sm hover:bg-white dark:bg-zinc-800/50 dark:text-zinc-200 dark:hover:bg-zinc-700/80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 hover:scale-105 active:scale-95"
              }
            `}
          >
            <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Back
          </button>

          {/* Progress Indicator */}
          <div className="flex flex-col items-center justify-center min-w-[100px]">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 dark:text-zinc-400 mb-1">
              Position
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-none">{activeIndex + 1}</span>
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-600 leading-none">/ {positions.length}</span>
            </div>
          </div>

          {/* Next / Review */}
          {isLast ? (
            <button
              disabled={!isOnline}
              onClick={handleReview}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && isOnline && handleReview()}
              aria-label="Review ballot and submit"
              className={`
                flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 shadow-lg
                ${isOnline
                  ? "bg-gradient-to-r from-maroon-600 to-maroon-500 text-white hover:from-maroon-500 hover:to-maroon-400 glow-maroon cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 hover:scale-105 active:scale-95 border border-maroon-400/50"
                  : "bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed"
                }
              `}
            >
              Review
              <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
          ) : (
            <button
              disabled={!isOnline}
              onClick={handleNext}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && isOnline && handleNext()}
              aria-label="Next position"
              className={`
                flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold transition-all duration-300 shadow-md
                ${!isOnline
                  ? "text-zinc-400/50 dark:text-zinc-600/50 cursor-not-allowed"
                  : "bg-white text-zinc-900 border border-zinc-200/50 hover:border-zinc-300 dark:bg-zinc-700 dark:text-white dark:border-white/10 dark:hover:bg-zinc-600 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 hover:scale-105 active:scale-95"
                }
              `}
            >
              Next
              <svg className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          )}
        </motion.div>
      </div>
    </div>
  );
}

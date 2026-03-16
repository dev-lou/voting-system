import { motion, AnimatePresence } from "framer-motion";
import { useBallotStore } from "../stores/ballotStore";
import { CandidateCard } from "./CandidateCard";
import { sounds } from "../utils/sounds";
import type { PositionWithCandidates } from "../lib/types";

interface BallotPaneProps {
  positions: PositionWithCandidates[];
  isOnline: boolean;
}

/**
 * Core voting panel. Fixed layout:
 * Position tab bar > Candidate grid (scrollable) > Bottom nav bar.
 */
export function BallotPane({ positions, isOnline }: BallotPaneProps) {
  const activeIndex = useBallotStore((s) => s.activePositionIndex);
  const setActiveIndex = useBallotStore((s) => s.setActivePositionIndex);
  const setShowReview = useBallotStore((s) => s.setShowReview);
  const getSelectionCount = useBallotStore((s) => s.getSelectionCount);

  const position = positions[activeIndex];

  if (!position) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 dark:text-zinc-400">
        No positions available.
      </div>
    );
  }

  const isFirst = activeIndex === 0;
  const isLast = activeIndex === positions.length - 1;
  const candidateCount = position.candidates.length;

  const handlePositionClick = (index: number) => {
    sounds.playClick();
    setActiveIndex(index);
  };

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
      ? "grid-cols-1 sm:grid-cols-2 max-w-3xl"
      : candidateCount <= 4
        ? "grid-cols-2 lg:grid-cols-3 max-w-5xl"
        : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl";

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ─── Position Tab Bar ─── */}
      <div className="flex h-11 shrink-0 items-center gap-1 overflow-x-auto border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900">
        {positions.map((pos, idx) => {
          const isActive = idx === activeIndex;
          const count = getSelectionCount(pos.id);
          return (
            <button
              key={pos.id}
              onClick={() => handlePositionClick(idx)}
              disabled={!isOnline}
              className={`
                flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150
                ${isActive
                  ? "bg-maroon-700 text-white"
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                }
                ${!isOnline ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
              `}
            >
              {pos.title}
              {count > 0 && !isActive && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-maroon-100 text-[10px] font-semibold text-maroon-700 dark:bg-maroon-900 dark:text-maroon-400">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── Position Header ─── */}
      <div className="shrink-0 border-b border-zinc-100 bg-white px-6 py-3 dark:border-zinc-800/50 dark:bg-zinc-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={position.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="flex items-baseline gap-3"
          >
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              {position.title}
            </h2>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              Select up to {position.max_votes}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Candidate Grid ─── */}
      <div className="flex-1 overflow-y-auto bg-zinc-50 p-6 scrollbar-thin dark:bg-zinc-950">
        <AnimatePresence mode="wait">
          <motion.div
            key={position.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className={`mx-auto grid ${gridClass} gap-4`}
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
          <div className="flex items-center justify-center py-20 text-sm text-zinc-400 dark:text-zinc-500">
            No candidates for this position.
          </div>
        )}
      </div>

      {/* ─── Bottom Navigation Bar ─── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-t border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900">
        {/* Previous */}
        <button
          disabled={isFirst || !isOnline}
          onClick={handlePrevious}
          className={`
            flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150
            ${isFirst || !isOnline
              ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
              : "cursor-pointer text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }
          `}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Previous
        </button>

        {/* Position indicator */}
        <div className="flex items-center gap-1.5">
          {positions.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handlePositionClick(idx)}
              disabled={!isOnline}
              className={`
                h-1.5 rounded-full transition-all duration-200
                ${idx === activeIndex
                  ? "w-6 bg-maroon-700"
                  : getSelectionCount(positions[idx].id) > 0
                    ? "w-1.5 bg-maroon-300 dark:bg-maroon-600 cursor-pointer"
                    : "w-1.5 bg-zinc-300 dark:bg-zinc-600 cursor-pointer"
                }
              `}
            />
          ))}
          <span className="ml-2 text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
            {activeIndex + 1}/{positions.length}
          </span>
        </div>

        {/* Next / Review */}
        {isLast ? (
          <button
            disabled={!isOnline}
            onClick={handleReview}
            className={`
              flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold transition-colors duration-150
              ${isOnline
                ? "cursor-pointer bg-maroon-700 text-white hover:bg-maroon-800"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
              }
            `}
          >
            Review Ballot
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </button>
        ) : (
          <button
            disabled={!isOnline}
            onClick={handleNext}
            className={`
              flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-150
              ${!isOnline
                ? "cursor-not-allowed text-zinc-300 dark:text-zinc-600"
                : "cursor-pointer text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              }
            `}
          >
            Next
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

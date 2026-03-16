import { motion } from "framer-motion";
import { useBallotStore } from "../stores/ballotStore";
import { sounds } from "../utils/sounds";
import type { Candidate } from "../lib/types";

interface CandidateCardProps {
  candidate: Candidate;
  positionId: string;
  maxVotes: number;
  isOnline: boolean;
  index?: number;
}

/**
 * Desktop candidate card.
 * Fills grid cell. Sharp corners. Tight spacing.
 * Subtle hover, clean selected state.
 */
export function CandidateCard({
  candidate,
  positionId,
  maxVotes,
  isOnline,
  index = 0,
}: CandidateCardProps) {
  const isSelected = useBallotStore((s) => s.isSelected(positionId, candidate.id));
  const isLimitReached = useBallotStore((s) => s.isLimitReached(positionId, maxVotes));
  const toggle = useBallotStore((s) => s.toggleCandidate);

  const isDisabled = !isOnline || (isLimitReached && !isSelected);
  const hasPhoto = !!candidate.photo_url;

  const handleClick = () => {
    if (!isDisabled) {
      sounds.playClick();
      toggle(positionId, candidate.id, maxVotes);
    }
  };

  return (
    <motion.button
      type="button"
      disabled={isDisabled}
      onClick={handleClick}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.04,
        ease: "easeOut",
      }}
      whileHover={!isDisabled ? { scale: 1.01 } : undefined}
      whileTap={!isDisabled ? { scale: 0.99 } : undefined}
      className={`
        relative flex w-full flex-col overflow-hidden rounded-xl text-left transition-all duration-200
        ${isSelected
          ? "border-2 border-maroon-600 bg-white shadow-md shadow-maroon-500/10 ring-1 ring-maroon-500/20 dark:border-maroon-500 dark:bg-zinc-900 dark:shadow-maroon-500/5"
          : "border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
        }
        ${isDisabled && !isSelected ? "cursor-not-allowed opacity-40" : "cursor-pointer"}
      `}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute right-2.5 top-2.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-maroon-700 dark:bg-maroon-600">
          <motion.svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <motion.path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m4.5 12.75 6 6 9-13.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </motion.svg>
        </div>
      )}

      {/* Photo / Initials */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {hasPhoto ? (
          <img
            src={candidate.photo_url!}
            alt={candidate.full_name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900">
            <span className="text-4xl font-semibold tracking-tight text-zinc-400 dark:text-zinc-600">
              {candidate.full_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-center px-4 py-3">
        <p
          className={`text-sm font-semibold tracking-tight ${
            isSelected
              ? "text-maroon-700 dark:text-maroon-400"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {candidate.full_name}
        </p>
        {candidate.party && (
          <p
            className={`mt-0.5 text-xs ${
              isSelected
                ? "text-maroon-500 dark:text-maroon-500"
                : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {candidate.party}
          </p>
        )}
      </div>
    </motion.button>
  );
}

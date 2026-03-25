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
 * 2026 Premium Candidate Card.
 * Utilizes glassmorphism, spring physics for interaction, and dynamic glows.
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
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && !isDisabled && handleClick()}
      aria-pressed={isSelected}
      aria-label={`Vote for ${candidate.full_name}${candidate.party ? ', ' + candidate.party : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: index * 0.05,
      }}
      whileHover={!isDisabled ? { scale: 1.03, y: -4 } : undefined}
      whileTap={!isDisabled ? { scale: 0.96 } : undefined}
      className={`
        relative flex w-full flex-col overflow-hidden rounded-2xl text-left transition-all duration-300
        ${isSelected
          ? "ring-2 ring-inset ring-maroon-500 bg-white/90 shadow-[0_8px_30px_rgb(0,0,0,0.12)] glow-maroon dark:bg-zinc-800/90 dark:ring-maroon-500"
          : isDisabled && !isSelected
            ? "cursor-not-allowed opacity-50 ring-1 ring-inset ring-zinc-200/50 shadow-sm glass-panel grayscale-[50%]"
            : "cursor-pointer ring-1 ring-inset ring-white/40 bg-white/60 shadow-lg hover:shadow-xl hover:bg-white/80 dark:bg-zinc-900/40 dark:ring-white/10 dark:hover:bg-zinc-800/60 dark:hover:ring-white/20 backdrop-blur-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500"
        }
      `}
    >
      {/* ─── Premium Selection Indicator ─── */}
      {isSelected && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-lg glow-maroon border border-white/20"
        >
          <motion.svg
            className="h-4 w-4 text-white drop-shadow-md"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </motion.svg>
        </motion.div>
      )}

      {/* ─── Dynamic Photo Area ─── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-2xl bg-zinc-100/50 dark:bg-zinc-800/50">
        {/* Inner shadow overlay for depth */}
        <div className="absolute inset-0 shadow-[inset_0_-20px_40px_-20px_rgba(0,0,0,0.2)] z-10 pointer-events-none" />
        
        {hasPhoto ? (
          <motion.img
            src={candidate.photo_url!}
            alt={candidate.full_name}
            className="h-full w-full object-cover"
            animate={{ scale: isSelected ? 1.05 : 1 }}
            transition={{ duration: 0.4 }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-200/50 to-zinc-100/20 dark:from-zinc-800/50 dark:to-zinc-900/40 backdrop-blur-md">
            <span className="text-5xl font-bold tracking-tighter text-zinc-400/50 dark:text-zinc-600/50 drop-shadow-sm">
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

      {/* ─── Premium Typography Area ─── */}
      <div className={`flex flex-1 flex-col justify-center px-6 py-5 border-t border-white/20 dark:border-white/5 ${isSelected ? 'bg-gradient-to-b from-transparent to-maroon-50/50 dark:to-maroon-900/20' : ''}`}>
        <p
          className={`text-[17px] font-bold tracking-tight truncate transition-colors ${
            isSelected
              ? "text-maroon-700 dark:text-maroon-400 drop-shadow-sm"
              : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {candidate.full_name}
        </p>
        {candidate.party && (
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-maroon-500 shadow-[0_0_8px_var(--color-maroon-500)]' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
            <p
              className={`text-[13px] font-medium truncate uppercase tracking-wider ${
                isSelected
                  ? "text-maroon-600/80 dark:text-maroon-400/80"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              {candidate.party}
            </p>
          </div>
        )}
      </div>
    </motion.button>
  );
}
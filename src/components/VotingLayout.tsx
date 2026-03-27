import { useSystemClock } from "../hooks/useSystemClock";
import { BallotPane } from "./BallotPane";
import { NetworkBadge } from "./NetworkBadge";
import { OfflineOverlay } from "./OfflineOverlay";
import { ReviewModal } from "./ReviewModal";
import { ThemeToggle } from "./ThemeToggle";
import { useBallotStore } from "../stores/ballotStore";
import { sounds } from "../utils/sounds";
import { Minus, Check, X } from "lucide-react";
import type { PositionWithCandidates } from "../lib/types";

interface VotingLayoutProps {
  positions: PositionWithCandidates[];
  electionName: string;
  isOnline: boolean;
  userEmail?: string;
  isSubmitting: boolean;
  onSubmit: () => void;
  abstainedPositions?: Set<string>;
  onAbstain?: (positionId: string) => void;
}

/**
 * 2026 Desktop app shell for the student voting view.
 * Features ambient background orbs, deep glassmorphism via .glass-panel,
 * and high-fidelity hover states.
 */
export function VotingLayout({
  positions,
  electionName,
  isOnline,
  userEmail,
  isSubmitting,
  onSubmit,
  abstainedPositions,
  onAbstain,
}: VotingLayoutProps) {
  const time = useSystemClock();
  const activeIndex = useBallotStore((s) => s.activePositionIndex);
  const setActiveIndex = useBallotStore((s) => s.setActivePositionIndex);
  const getSelectionCount = useBallotStore((s) => s.getSelectionCount);

  const handlePositionClick = (index: number) => {
    sounds.playClick();
    setActiveIndex(index);
  };

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-maroon-500/30">
      {/* ─── Ambient Background Orbs ─── */}
      <div className="pointer-events-none absolute -left-[10%] -top-[10%] h-[40vw] w-[40vw] rounded-full bg-maroon-400/10 blur-[120px] dark:bg-maroon-600/20 mix-blend-multiply dark:mix-blend-screen" />
      <div className="pointer-events-none absolute -bottom-[10%] -right-[5%] h-[50vw] w-[50vw] rounded-full bg-gold-400/10 blur-[150px] dark:bg-maroon-900/30 mix-blend-multiply dark:mix-blend-screen" />

      {/* ─── App Container ─── */}
      <div className="z-10 flex h-full w-full flex-col overflow-hidden">
        {/* ─── Native App Title Bar (Glass) ─── */}
        <header className="relative z-30 flex h-12 shrink-0 items-center justify-between glass-panel rounded-none border-t-0 border-x-0 border-b-white/50 px-5 text-sm dark:border-b-white/5 [-webkit-app-region:drag]">
          {/* Left: Branding + Clock */}
          <div className="flex items-center gap-4 [-webkit-app-region:no-drag]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-maroon-500 to-maroon-700 text-[10px] font-bold text-white shadow-md glow-maroon">
                V
              </div>
              <span className="font-bold tracking-wider text-zinc-900 dark:text-zinc-50">
                VOTE 2026
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">
              {time}
            </span>
          </div>

          {/* Center: Election Name */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5">
            <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse-dot" />
            <span className="font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              {electionName}
            </span>
          </div>

          {/* Right: Controls & macOS Windows */}
          <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
            {userEmail && (
              <>
                <span className="font-mono text-zinc-500 dark:text-zinc-400 font-medium bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-md">
                  {userEmail}
                </span>
                <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
              </>
            )}
            <NetworkBadge isOnline={isOnline} />
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            <ThemeToggle />
            <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
            {/* macOS-style window controls - Premium Hover */}
            <div className="group flex items-center gap-2 ml-1">
              <button aria-label="Minimize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-yellow-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm">
                <Minus className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button aria-label="Maximize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-green-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm">
                <Check className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
              <button aria-label="Close" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-red-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm">
                <X className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              </button>
            </div>
          </div>
        </header>

        {/* ─── Main Content Area (Sidebar + Pane) ─── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar (Glass) */}
          <aside className="relative z-20 flex w-[280px] shrink-0 flex-col glass-panel rounded-none border-y-0 border-l-0 border-r-white/50 dark:border-r-white/5 bg-white/40 dark:bg-zinc-900/30">
            <div className="px-5 py-5 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500">
                Ballot Sections
              </span>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2 scrollbar-thin">
              <div className="flex flex-col gap-1.5">
                {positions.map((pos, idx) => {
                  const isActive = idx === activeIndex;
                  const count = getSelectionCount(pos.id);
                  const isComplete = count > 0;
                  const isAbstained = abstainedPositions?.has(pos.id) ?? false;

                  return (
                    <button
                      key={pos.id}
                      onClick={() => handlePositionClick(idx)}
                      disabled={!isOnline}
                      aria-label={`Select ${pos.title}`}
                      className={`
                        group relative flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-left text-[14px] font-medium transition-all duration-300 min-h-[52px]
                        ${isActive
                          ? "bg-white/90 text-zinc-900 shadow-sm glass-panel dark:bg-zinc-800/80 dark:text-zinc-50 ring-1 ring-maroon-500/20 glow-maroon border-transparent"
                          : "text-zinc-600 hover:bg-white/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200 border border-transparent"
                        }
                        ${!isOnline ? "cursor-not-allowed opacity-50" : "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500"}
                      `}
                    >
                      {/* Active Indicator Bar */}
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1/2 w-1 bg-maroon-500 rounded-r-full shadow-[0_0_8px_var(--color-maroon-500)]" />
                      )}

                      <span className="truncate pr-3 flex-1">{pos.title}</span>
                      
                      {/* Status Icon */}
                      <div className="shrink-0 flex items-center justify-end w-5">
                        {isComplete ? (
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full shadow-inner ${isActive ? 'bg-maroon-600 text-white dark:bg-maroon-500 shadow-[0_0_10px_var(--color-maroon-500)]' : 'bg-maroon-100 text-maroon-600 dark:bg-maroon-900/40 dark:text-maroon-400'}`}>
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </div>
                        ) : isAbstained ? (
                          <div className={`flex h-5 w-5 items-center justify-center rounded-full ${isActive ? 'bg-zinc-400 text-white dark:bg-zinc-500 shadow-[0_0_10px_var(--color-zinc-400)]' : 'bg-zinc-200 text-zinc-500 dark:bg-zinc-700 dark:text-zinc-400'}`}>
                            <Minus className="h-2.5 w-2.5" strokeWidth={3} />
                          </div>
                        ) : (
                          <div className={`h-2 w-2 rounded-full transition-colors ${isActive ? 'bg-gold-400 shadow-[0_0_8px_var(--color-gold-400)]' : 'bg-zinc-300 dark:bg-zinc-700'}`} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Center Canvas (Transparent to show orbs) */}
          <main className="relative z-10 flex flex-1 flex-col overflow-hidden bg-transparent">
            <BallotPane positions={positions} isOnline={isOnline} abstainedPositions={abstainedPositions} onAbstain={onAbstain} />
          </main>
        </div>

        {/* ─── Overlays ─── */}
        <OfflineOverlay isOnline={isOnline} />
        <ReviewModal
          positions={positions}
          isOnline={isOnline}
          isSubmitting={isSubmitting}
          onSubmit={onSubmit}
          abstainedPositions={abstainedPositions}
        />
      </div>
    </div>
  );
}

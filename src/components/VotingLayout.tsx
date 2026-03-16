import { useSystemClock } from "../hooks/useSystemClock";
import { BallotPane } from "./BallotPane";
import { NetworkBadge } from "./NetworkBadge";
import { OfflineOverlay } from "./OfflineOverlay";
import { ReviewModal } from "./ReviewModal";
import { ThemeToggle } from "./ThemeToggle";
import type { PositionWithCandidates } from "../lib/types";

interface VotingLayoutProps {
  positions: PositionWithCandidates[];
  electionName: string;
  isOnline: boolean;
  userEmail?: string;
  isSubmitting: boolean;
  onSubmit: () => void;
}

/**
 * Desktop app shell for the student voting view.
 * Fixed viewport, panel-based layout.
 * Title bar + content + overlays.
 */
export function VotingLayout({
  positions,
  electionName,
  isOnline,
  userEmail,
  isSubmitting,
  onSubmit,
}: VotingLayoutProps) {
  const time = useSystemClock();

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* ─── Title Bar ─── */}
      <header className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        {/* Left: Branding + clock */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-sm bg-maroon-700" />
            <span className="font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
              VOTE
            </span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <span className="font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
            {time}
          </span>
        </div>

        {/* Center: Election name + secure indicator */}
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
          <span className="font-medium text-zinc-600 dark:text-zinc-400">
            {electionName}
          </span>
          <span className="text-zinc-300 dark:text-zinc-700">·</span>
          <span className="text-zinc-400 dark:text-zinc-500">
            Secure Session
          </span>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <NetworkBadge isOnline={isOnline} />
          {userEmail && (
            <>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <span className="font-mono text-zinc-500 dark:text-zinc-400">
                {userEmail}
              </span>
            </>
          )}
        </div>
      </header>

      {/* ─── Content ─── */}
      <BallotPane positions={positions} isOnline={isOnline} />

      {/* ─── Overlays ─── */}
      <OfflineOverlay isOnline={isOnline} />
      <ReviewModal
        positions={positions}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </div>
  );
}

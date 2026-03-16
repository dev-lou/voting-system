interface OfflineOverlayProps {
  isOnline: boolean;
}

/**
 * Full-screen overlay that blocks ALL interaction when network drops.
 * Renders at z-50 with a backdrop. Theme-aware.
 */
export function OfflineOverlay({ isOnline }: OfflineOverlayProps) {
  if (isOnline) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 backdrop-blur-sm dark:bg-zinc-950/90">
      <div className="flex flex-col items-center gap-4 rounded-xl border border-red-200 bg-white px-10 py-8 shadow-2xl dark:border-red-800 dark:bg-zinc-900">
        {/* Disconnect icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30">
          <svg
            className="h-6 w-6 text-red-500 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Connection Lost
          </p>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            Waiting for network... All actions are disabled.
          </p>
        </div>
        {/* Animated dots — using CSS animation-delay via utility classes */}
        <div className="flex gap-1.5 pt-2">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 dark:bg-red-400" />
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 [animation-delay:300ms] dark:bg-red-400" />
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500 [animation-delay:600ms] dark:bg-red-400" />
        </div>
      </div>
    </div>
  );
}

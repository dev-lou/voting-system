interface NetworkBadgeProps {
  isOnline: boolean;
}

/**
 * Live connection indicator — colored dot + text label.
 * Green = connected, Red = disconnected. Theme-aware.
 */
export function NetworkBadge({ isOnline }: NetworkBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <div
        className={`h-1.5 w-1.5 rounded-full ${
          isOnline
            ? "bg-green-500 dark:bg-green-400"
            : "bg-red-500 dark:bg-red-400"
        }`}
      />
      <span
        className={`text-xs font-medium ${
          isOnline
            ? "text-green-600 dark:text-green-400"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {isOnline ? "Online" : "Offline"}
      </span>
    </div>
  );
}

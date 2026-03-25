import { motion } from "framer-motion";

interface NetworkBadgeProps {
  isOnline: boolean;
}

/**
 * 2026 Premium Network Badge
 * Pulsing glow indicator with animated status text.
 */
export function NetworkBadge({ isOnline }: NetworkBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div
          className={`absolute h-3 w-3 rounded-full animate-ping ${
            isOnline ? "bg-green-500/40" : "bg-red-500/40"
          }`}
        />
        {/* Core dot */}
        <div
          className={`relative h-2.5 w-2.5 rounded-full shadow-lg ${
            isOnline
              ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"
              : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.6)]"
          }`}
        />
      </div>
      <motion.span
        key={isOnline ? "online" : "offline"}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`text-[11px] font-bold uppercase tracking-widest ${
          isOnline
            ? "text-green-600 dark:text-green-400"
            : "text-red-500 dark:text-red-400"
        }`}
      >
        {isOnline ? "Live" : "Offline"}
      </motion.span>
    </div>
  );
}

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

interface OfflineOverlayProps {
  isOnline: boolean;
}

/**
 * 2026 Premium Offline Overlay
 * Immersive glass takeover with animated connection indicator.
 */
export function OfflineOverlay({ isOnline }: OfflineOverlayProps) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-2xl"
        >
          {/* Ambient Red Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40vw] w-[40vw] rounded-full bg-red-600/10 blur-[120px] pointer-events-none" />

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 flex flex-col items-center gap-6 glass-panel rounded-3xl px-16 py-12 max-w-md"
          >
            {/* Animated Disconnect Icon */}
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
              >
                <AlertTriangle
                  className="h-10 w-10 text-red-500 dark:text-red-400"
                  strokeWidth={1.5}
                />
              </motion.div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Connection Lost
              </h2>
              <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                Waiting for network connection. All voting actions are temporarily disabled.
              </p>
            </div>

            {/* Animated Loading Dots */}
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.2, 0.8] }}
                  transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3, ease: "easeInOut" }}
                  className="h-2 w-2 rounded-full bg-red-500 dark:bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                />
              ))}
            </div>

            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">
              Auto-reconnecting
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

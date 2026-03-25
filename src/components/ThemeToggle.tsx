import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../utils/theme.tsx";

/**
 * 2026 Premium Theme Toggle
 * Animated pill with sun/moon morph, glow effects, and satisfying spring physics.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`
        relative flex h-8 w-14 items-center rounded-full p-1 transition-all duration-500 cursor-pointer
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
        ${isDark
          ? "bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_0_16px_rgba(99,102,241,0.15)]"
          : "bg-zinc-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_0_16px_rgba(250,204,21,0.15)]"
        }
      `}
    >
      {/* Track Glow */}
      <div className={`absolute inset-0 rounded-full transition-opacity duration-500 ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
      </div>

      {/* Sliding Knob */}
      <motion.div
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`
          relative z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-lg
          ${isDark
            ? "bg-zinc-700 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            : "bg-white shadow-[0_0_12px_rgba(250,204,21,0.4)]"
          }
        `}
        style={{ x: isDark ? 22 : 0 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.svg
              key="moon"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-3.5 h-3.5 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="sun"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-3.5 h-3.5 text-amber-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

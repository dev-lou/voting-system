import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../utils/theme.tsx";
import { Moon, Sun } from "lucide-react";

const MotionMoon = motion(Moon);
const MotionSun = motion(Sun);

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
            <MotionMoon
              key="moon"
              initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: 90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-indigo-400"
              size={14}
              strokeWidth={2.5}
            />
          ) : (
            <MotionSun
              key="sun"
              initial={{ opacity: 0, rotate: 90, scale: 0.5 }}
              animate={{ opacity: 1, rotate: 0, scale: 1 }}
              exit={{ opacity: 0, rotate: -90, scale: 0.5 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-amber-500"
              size={14}
              strokeWidth={2.5}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </button>
  );
}

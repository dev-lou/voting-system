import { useTheme } from "../utils/theme.tsx";
import { Moon, Sun } from "lucide-react";

/**
 * 2026 Premium Theme Toggle
 * Animated pill with sun/moon morph, glow effects, and satisfying spring physics via CSS.
 */
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      style={{ viewTransitionName: 'theme-toggle-btn' }}
      className={`
        relative flex h-8 w-16 items-center rounded-full p-1 cursor-pointer
        focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
        ${isDark
          ? "bg-zinc-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.4),0_0_16px_rgba(99,102,241,0.15)]"
          : "bg-zinc-200 shadow-[inset_0_2px_4px_rgba(0,0,0,0.08),0_0_16px_rgba(250,204,21,0.15)]"
        }
      `}
    >
      {/* Track Glow */}
      <div className={`absolute inset-0 rounded-full ${isDark ? 'opacity-100' : 'opacity-0'}`}>
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10" />
      </div>

      {/* Sliding Knob */}
      <div
        id="theme-knob"
        style={{ viewTransitionName: 'theme-toggle-knob' }}
        className={`
          relative z-10 flex h-6 w-6 items-center justify-center rounded-full shadow-lg
          transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isDark
            ? "translate-x-[32px] bg-zinc-700 shadow-[0_0_12px_rgba(99,102,241,0.4)]"
            : "translate-x-0 bg-white shadow-[0_0_12px_rgba(250,204,21,0.4)]"
          }
        `}
      >
        <div className="relative flex items-center justify-center h-full w-full">
          <Moon
            style={{ viewTransitionName: 'theme-toggle-moon' }}
            className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-indigo-400 ${
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
            }`}
            size={14}
            strokeWidth={2.5}
          />
          <Sun
            style={{ viewTransitionName: 'theme-toggle-sun' }}
            className={`absolute transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] text-amber-500 ${
              isDark ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
            }`}
            size={14}
            strokeWidth={2.5}
          />
        </div>
      </div>
    </button>
  );
}

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

const MotionChevronDown = motion(ChevronDown);

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * 2026 Premium Custom Select
 * Glass-morphism dropdown with spring animation and keyboard navigation.
 * Replaces all native <select> elements across the app.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select...",
  className = "",
  disabled = false,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Keyboard nav
  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen((o) => !o); }
    if (e.key === "Escape") setOpen(false);
    if (e.key === "ArrowDown" && open) {
      const idx = options.findIndex((o) => o.value === value);
      const next = options[Math.min(idx + 1, options.length - 1)];
      if (next) { onChange(next.value); }
    }
    if (e.key === "ArrowUp" && open) {
      const idx = options.findIndex((o) => o.value === value);
      const prev = options[Math.max(idx - 1, 0)];
      if (prev) { onChange(prev.value); }
    }
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`
          flex w-full items-center justify-between gap-3 rounded-xl
          border border-zinc-200/80 bg-white/90 px-4 py-2.5 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)]
          text-sm font-medium backdrop-blur-md
          transition-all duration-200
          dark:border-white/10 dark:bg-zinc-800/60 dark:shadow-none
          ${open
            ? "border-maroon-500 shadow-[0_0_20px_rgba(244,63,110,0.12)] ring-2 ring-maroon-500/15 dark:border-maroon-500"
            : "hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white"
          }
          ${disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer"
          }
        `}
      >
        <span className={selected ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}>
          {selected ? selected.label : placeholder}
        </span>
        <MotionChevronDown
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="shrink-0 text-zinc-400 dark:text-zinc-500"
          size={16}
          strokeWidth={2}
        />
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="
              absolute z-50 mt-2 w-full min-w-[10rem] overflow-hidden rounded-2xl
              border border-white/50 bg-white/90 shadow-2xl backdrop-blur-2xl
              dark:border-white/10 dark:bg-zinc-900/90
              shadow-[0_16px_40px_rgba(0,0,0,0.12),0_0_0_1px_rgba(255,255,255,0.05)]
            "
          >
            <div className="max-h-60 overflow-y-auto p-1.5 scrollbar-thin">
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className={`
                      flex cursor-pointer items-center gap-3 rounded-xl px-3.5 py-2.5
                      text-sm font-medium transition-all duration-150
                      ${isSelected
                        ? "bg-maroon-500/10 text-maroon-700 dark:bg-maroon-500/15 dark:text-maroon-400"
                        : "text-zinc-700 hover:bg-zinc-100/80 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
                      }
                    `}
                  >
                    {/* Check icon for selected */}
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center ${isSelected ? "opacity-100" : "opacity-0"}`}>
                      <Check className="h-3.5 w-3.5 text-maroon-600 dark:text-maroon-400" strokeWidth={2.5} />
                    </span>
                    {opt.label}
                  </li>
                );
              })}
            </div>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

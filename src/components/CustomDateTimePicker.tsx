import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CustomDateTimePickerProps {
  value: string; // ISO string like "YYYY-MM-DDThh:mm"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/**
 * 2026 Premium Custom Date/Time Picker
 * Fully replaces the native <input type="datetime-local">
 * Features glassmorphism, Framer Motion springs, and an intuitive UI.
 */
export function CustomDateTimePicker({
  value,
  onChange,
  placeholder = "Select date and time...",
  disabled = false,
}: CustomDateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // State for the calendar view
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());

  // Time states (if value exists, parse it. otherwise defaults)
  const initialDate = value ? new Date(value) : null;
  const [hour, setHour] = useState(initialDate ? initialDate.getHours() % 12 || 12 : 12);
  const [minute, setMinute] = useState(initialDate ? initialDate.getMinutes() : 0);
  const [isPM, setIsPM] = useState(initialDate ? initialDate.getHours() >= 12 : false);

  // Sync internal view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewDate(new Date(d));
        setHour(d.getHours() % 12 || 12);
        setMinute(d.getMinutes());
        setIsPM(d.getHours() >= 12);
      }
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Helper to format the display text
  function getDisplayText() {
    if (!value) return null;
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Helper to construct "YYYY-MM-DDThh:mm" string
  function emitChange(selectedDate: Date, h: number, m: number, pm: boolean) {
    let hrs24 = h;
    if (pm && h < 12) hrs24 += 12;
    if (!pm && h === 12) hrs24 = 0;

    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const hh = String(hrs24).padStart(2, "0");
    const min = String(m).padStart(2, "0");

    onChange(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
  }

  function handleDayClick(dayRaw: number) {
    const newDate = new Date(year, month, dayRaw);
    emitChange(newDate, hour, minute, isPM);
    // Don't close immediately so they can adjust time if needed
  }

  function handleTimeChange(h: number, m: number, pm: boolean) {
    setHour(h);
    setMinute(m);
    setIsPM(pm);
    const dateToUse = value ? new Date(value) : new Date();
    emitChange(dateToUse, h, m, pm);
  }

  function changeMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1));
  }

  // Generate blank spaces for the start of the month calendar grid
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  // Generate days
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedDateObj = value ? new Date(value) : null;
  const isSelected = (d: number) =>
    selectedDateObj &&
    selectedDateObj.getDate() === d &&
    selectedDateObj.getMonth() === month &&
    selectedDateObj.getFullYear() === year;

  // Render Time selectors safely
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div ref={ref} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`
          flex w-full items-center justify-between gap-3 rounded-xl
          border border-zinc-200/80 bg-white/90 px-4 py-3 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.06)]
          text-sm font-medium backdrop-blur-md
          transition-all duration-300
          dark:border-white/10 dark:bg-zinc-800/60 dark:shadow-none
          ${
            open
              ? "border-maroon-500 shadow-[0_0_20px_rgba(244,63,110,0.12)] ring-2 ring-maroon-500/15 dark:border-maroon-500"
              : "hover:border-zinc-300 dark:hover:border-white/20 hover:bg-white dark:hover:bg-zinc-800"
          }
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
        `}
      >
        <span className={value ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"}>
          {getDisplayText() || placeholder}
        </span>
        <svg
          className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12v-.008zM9 15h.008v.008H9v-.008zm-3 0h.008v.008H6v-.008z" />
        </svg>
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="
              absolute z-50 mt-2 right-0 w-full min-w-[300px] max-w-sm rounded-[1.5rem]
              border border-white/50 bg-white/90 shadow-2xl backdrop-blur-2xl
              dark:border-white/10 dark:bg-zinc-900/95
              shadow-[0_24px_50px_-12px_rgba(0,0,0,0.25),0_0_0_1px_rgba(255,255,255,0.05)]
              overflow-hidden flex flex-col p-4 gap-4
            "
          >
            {/* Header: Month / Year / Nav */}
            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => changeMonth(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <div className="text-sm font-bold tracking-wide text-zinc-900 dark:text-zinc-100">
                {MONTHS[month]} {year}
              </div>
              <button
                type="button"
                onClick={() => changeMonth(1)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-y-2 text-center">
              {/* Days Header */}
              {DAYS.map((d) => (
                <div key={d} className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  {d}
                </div>
              ))}
              {/* Blank Start Days */}
              {blanks.map((b) => (
                <div key={`blank-${b}`} className="h-8 w-full" />
              ))}
              {/* Month Days */}
              {calendarDays.map((d) => {
                const active = isSelected(d);
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDayClick(d)}
                    className={`
                      mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors
                      ${active 
                        ? "bg-maroon-600 text-white shadow-[0_0_12px_rgba(244,63,110,0.5)]" 
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }
                    `}
                  >
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Time Selector Divider */}
            <div className="h-px w-full bg-zinc-200 dark:bg-zinc-800" />

            {/* Time Selector */}
            <div className="flex items-center justify-center gap-2 px-2 pb-1">
              <svg className="mr-2 h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
              {/* Hour Box */}
              <div className="relative group">
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={pad(hour)}
                  onChange={(e) => handleTimeChange(Math.max(1, Math.min(12, parseInt(e.target.value) || 12)), minute, isPM)}
                  className="w-14 appearance-none rounded-lg bg-zinc-100 p-2 text-center text-sm font-bold text-zinc-900 outline-none hover:bg-zinc-200 focus:bg-white focus:ring-2 focus:ring-maroon-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus:bg-zinc-900"
                />
              </div>
              <span className="font-bold text-zinc-400">:</span>
              {/* Minute Box */}
              <div className="relative group">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={pad(minute)}
                  onChange={(e) => handleTimeChange(hour, Math.max(0, Math.min(59, parseInt(e.target.value) || 0)), isPM)}
                  className="w-14 appearance-none rounded-lg bg-zinc-100 p-2 text-center text-sm font-bold text-zinc-900 outline-none hover:bg-zinc-200 focus:bg-white focus:ring-2 focus:ring-maroon-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:focus:bg-zinc-900"
                />
              </div>
              {/* AM / PM Toggle */}
              <div className="ml-2 flex rounded-lg bg-zinc-100 p-1 dark:bg-zinc-800">
                <button
                  type="button"
                  onClick={() => handleTimeChange(hour, minute, false)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-all ${!isPM ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(hour, minute, true)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-bold transition-all ${isPM ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"}`}
                >
                  PM
                </button>
              </div>
            </div>

            {/* Confirm button just safely closes it, state is updated seamlessly onChange */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl bg-zinc-900 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98] dark:bg-white dark:text-zinc-900"
            >
              Confirm Date & Time
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

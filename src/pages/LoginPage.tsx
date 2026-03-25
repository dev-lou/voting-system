import { useState, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useSystemClock } from "../hooks/useSystemClock";
import { ThemeToggle } from "../components/ThemeToggle";
import { ADMIN_SESSION_KEY, STUDENT_SESSION_KEY } from "../App";
import type { Student } from "../lib/types";

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000;
const ATTEMPTS_KEY = "login-attempts";

function loadAttempts(): { count: number; lockedUntil: number } {
  try {
    const raw = sessionStorage.getItem(ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : { count: 0, lockedUntil: 0 };
  } catch {
    return { count: 0, lockedUntil: 0 };
  }
}

function saveAttempts(count: number, lockedUntil: number) {
  sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, lockedUntil }));
}

interface LoginPageProps {
  onAuthenticated: (role: "admin" | "voter") => void;
}

export function LoginPage({ onAuthenticated }: LoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const time = useSystemClock();

  useEffect(() => {
    const { lockedUntil } = loadAttempts();
    const remaining = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
    if (remaining > 0) {
      setLockoutSeconds(remaining);
      const interval = setInterval(() => {
        const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
        setLockoutSeconds(left);
        if (left <= 0) {
          clearInterval(interval);
          saveAttempts(0, 0);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, []);

  const isLockedOut = lockoutSeconds > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLockedOut) return;

    setError(null);
    setLoading(true);

    try {
      const id = identifier.trim();

      const { data: adminData, error: adminRpcErr } = await supabase.rpc(
        "admin_login",
        { p_email: id.toLowerCase(), p_password: password }
      );

      if (!adminRpcErr) {
        const adminRows = adminData as { id: string; email: string }[] | null;
        if (adminRows && adminRows.length > 0) {
          sessionStorage.setItem(ADMIN_SESSION_KEY, adminRows[0].email);
          sessionStorage.removeItem(ATTEMPTS_KEY);
          onAuthenticated("admin");
          return;
        }
      }

      const { data: studentData, error: studentRpcErr } = await supabase.rpc(
        "student_login",
        { p_email: id.toLowerCase(), p_password: password }
      );

      if (studentRpcErr) {
        handleFailedAttempt();
        return;
      }

      const studentRows = studentData as Student[] | null;
      if (!studentRows || studentRows.length === 0) {
        handleFailedAttempt();
        return;
      }

      const student = studentRows[0];

      if (student.has_voted) {
        setError("You have already submitted your ballot.");
        return;
      }

      sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(student));
      sessionStorage.removeItem(ATTEMPTS_KEY);
      onAuthenticated("voter");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  function handleFailedAttempt() {
    const { count } = loadAttempts();
    const newCount = count + 1;
    if (newCount >= LOCKOUT_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      saveAttempts(newCount, lockedUntil);
      setLockoutSeconds(LOCKOUT_DURATION_MS / 1000);
      const interval = setInterval(() => {
        const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
        setLockoutSeconds(left);
        if (left <= 0) {
          clearInterval(interval);
          saveAttempts(0, 0);
        }
      }, 1000);
    } else {
      saveAttempts(newCount, 0);
      setError("Invalid credentials. Please try again.");
    }
  }

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-maroon-500/30">
      {/* ─── Ambient Background Orbs ─── */}
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[60vw] w-[60vw] rounded-full bg-maroon-500/8 blur-[160px] dark:bg-maroon-600/15 mix-blend-multiply dark:mix-blend-screen" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-[50vw] w-[50vw] rounded-full bg-gold-400/8 blur-[140px] dark:bg-indigo-600/10 mix-blend-multiply dark:mix-blend-screen" />

      {/* ─── Title Bar ─── */}
      <div className="relative z-30 flex h-12 shrink-0 items-center justify-between glass-panel rounded-none border-t-0 border-x-0 border-b-white/50 px-5 text-sm dark:border-b-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-maroon-500 to-maroon-700 text-[10px] font-bold text-white shadow-md glow-maroon">
            V
          </div>
          <span className="font-bold tracking-wider text-zinc-900 dark:text-zinc-50">VOTE 2026</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">{time}</span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
          <ThemeToggle />
        </div>
      </div>

      {/* ─── Centered Login Card ─── */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-full max-w-md glass-panel rounded-3xl p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)]"
        >
          {/* Premium Logo */}
          <div className="mb-10 flex justify-center">
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
              className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-xl glow-maroon border border-white/20"
            >
              <svg className="h-10 w-10 text-white drop-shadow-lg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </motion.div>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
              Welcome
            </h1>
            <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Sign in to vote or manage elections
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-6 bg-maroon-500/50"></div>
              <svg className="h-3.5 w-3.5 text-maroon-500 dark:text-maroon-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500 dark:text-maroon-400">Secured Terminal</span>
              <div className="h-px w-6 bg-maroon-500/50"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2.5 block text-sm font-bold text-zinc-700 dark:text-zinc-300">Email</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading || isLockedOut}
                autoComplete="email"
                className="w-full rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-base text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 focus:shadow-[0_0_20px_rgba(244,63,110,0.15)] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/20"
                placeholder="you@university.edu"
                aria-describedby="identifier-error"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2.5 block text-sm font-bold text-zinc-700 dark:text-zinc-300">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading || isLockedOut}
                autoComplete="current-password"
                className="w-full rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-base text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 focus:shadow-[0_0_20px_rgba(244,63,110,0.15)] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/20"
                placeholder="Enter password"
                aria-describedby="password-error"
              />
            </div>

            {isLockedOut && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-xl border border-amber-300/50 bg-amber-500/10 px-5 py-3.5 text-sm font-semibold text-amber-700 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-400 backdrop-blur-md"
                aria-live="polite"
              >
                Too many failed attempts. Try again in {lockoutSeconds}s.
              </motion.div>
            )}

            {error && !isLockedOut && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border border-red-300/50 bg-red-500/10 px-5 py-3.5 text-sm font-semibold text-red-600 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-400 backdrop-blur-md"
                aria-live="assertive"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || isLockedOut}
              aria-label={loading ? "Signing in" : isLockedOut ? `Locked, ${lockoutSeconds} seconds remaining` : "Sign in to voting system"}
              className={`
                group relative w-full overflow-hidden rounded-xl py-4 text-base font-extrabold transition-all duration-300
                ${loading || isLockedOut
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-600"
                  : "bg-gradient-to-r from-maroon-600 to-maroon-500 text-white shadow-lg glow-maroon hover:from-maroon-500 hover:to-maroon-400 hover:scale-[1.02] active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500"
                }
              `}
            >
              {/* Sweep animation */}
              {!loading && !isLockedOut && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />
              )}
              <span className="relative z-10">
                {loading ? "Signing in..." : isLockedOut ? "Locked (" + lockoutSeconds + "s)" : "Sign In"}
              </span>
            </button>
          </form>

          <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Secured voting terminal — unauthorized access prohibited
          </p>
        </motion.div>
      </div>
    </div>
  );
}

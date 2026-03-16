import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useSystemClock } from "../hooks/useSystemClock";
import { ThemeToggle } from "../components/ThemeToggle";
import { ADMIN_SESSION_KEY, STUDENT_SESSION_KEY } from "../App";
import type { Student } from "../lib/types";

interface LoginPageProps {
  onAuthenticated: (role: "admin" | "voter") => void;
  onGoToRegister: () => void;
}

/**
 * Unified login page — single form, role detected automatically.
 * Desktop app aesthetic, theme-aware.
 */
export function LoginPage({ onAuthenticated, onGoToRegister }: LoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const time = useSystemClock();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const id = identifier.trim();

      // ── 1. Try admin login ─────────────────────────────────────────────
      const { data: adminData, error: adminRpcErr } = await supabase.rpc(
        "admin_login",
        { p_email: id.toLowerCase(), p_password: password }
      );

      if (!adminRpcErr) {
        const adminRows = adminData as { id: string; email: string }[] | null;
        if (adminRows && adminRows.length > 0) {
          sessionStorage.setItem(ADMIN_SESSION_KEY, adminRows[0].email);
          onAuthenticated("admin");
          return;
        }
      }

      // ── 2. Try student login ───────────────────────────────────────────
      const { data: studentData, error: studentRpcErr } = await supabase.rpc(
        "student_login",
        { p_email: id.toLowerCase(), p_password: password }
      );

      if (studentRpcErr) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      const studentRows = studentData as Student[] | null;
      if (!studentRows || studentRows.length === 0) {
        setError("Invalid credentials. Please try again.");
        return;
      }

      const student = studentRows[0];

      if (student.has_voted) {
        setError("You have already submitted your ballot.");
        return;
      }

      sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(student));
      onAuthenticated("voter");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Mini title bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-semibold tracking-wider text-maroon-700 dark:text-maroon-500">VOTE</span>
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">{time}</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-sm">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
              <svg className="h-6 w-6 text-maroon-700 dark:text-maroon-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Welcome</h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Sign in to vote or manage elections
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="identifier"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Email
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors duration-150 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-900/50"
                placeholder="you@university.edu"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors duration-150 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-900/50"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-maroon-700 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-maroon-800 active:bg-maroon-900 disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer dark:bg-maroon-600 dark:hover:bg-maroon-700 dark:active:bg-maroon-800 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-6 text-center">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">Not registered yet? </span>
            <button
              type="button"
              onClick={onGoToRegister}
              disabled={loading}
              className="text-sm font-medium text-maroon-600 hover:text-maroon-700 disabled:opacity-50 cursor-pointer dark:text-maroon-500 dark:hover:text-maroon-400"
            >
              Create an account
            </button>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-400 dark:text-zinc-500">
            This is a secured voting terminal. Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}

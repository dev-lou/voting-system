import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useSystemClock } from "../hooks/useSystemClock";
import { ThemeToggle } from "../components/ThemeToggle";
import { InstallPrompt } from "../components/InstallPrompt";
import { ADMIN_SESSION_KEY, STUDENT_SESSION_KEY } from "../App";
import { useBallotStore } from "../stores/ballotStore";
import type { Student } from "../lib/types";
import { X, Minus, Check, Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";

interface LoginPageProps {
  onAuthenticated: (role: "admin" | "voter") => void;
  onGoToRegister?: () => void;
}

export function LoginPage({ onAuthenticated, onGoToRegister }: LoginPageProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setVoterPassword = useBallotStore((s) => s.setVoterPassword);
  const time = useSystemClock();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

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
          onAuthenticated("admin");
          return;
        }
      }

      const { data: studentData, error: studentRpcErr } = await supabase.rpc(
        "voter_login",
        { p_voter_id: id.toLowerCase(), p_password: password }
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

      // Store voter session + password (in-memory) for ballot submission auth
      sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(student));
      setVoterPassword(password);
      onAuthenticated("voter");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div 
      className="relative flex h-screen w-screen flex-col overflow-hidden font-sans selection:bg-maroon-500/30 bg-zinc-50 dark:bg-[#09090b]"
    >
      {/* ─── Premium Technical Grid Background ─── */}
      <div 
        className="pointer-events-none absolute inset-0 z-0 opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, rgba(128,128,128,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.2) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 100% 100% at 50% 50%, black 30%, transparent 100%)'
        }}
      />
      
      {/* ─── Elegant Ambient Orbs ─── */}
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[70vw] w-[70vw] rounded-full bg-maroon-500/10 blur-[120px] mix-blend-multiply dark:bg-maroon-600/20 dark:mix-blend-screen z-0 transition-opacity duration-1000" />
      <div className="pointer-events-none absolute bottom-[-20%] right-[-10%] h-[60vw] w-[60vw] rounded-full bg-blue-500/10 blur-[120px] mix-blend-multiply dark:bg-blue-600/20 dark:mix-blend-screen z-0 transition-opacity duration-1000" />

      {/* ─── Institutional Watermarks ─── */}
      <div className="pointer-events-none absolute bottom-10 right-10 z-0 flex items-center gap-6 opacity-90 dark:opacity-80 transition-opacity duration-1000">
        <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full bg-white p-2 shadow-2xl ring-4 ring-white/20">
          <img src="/logo.png" alt="ISUFST" className="h-full w-full object-contain scale-105" />
        </div>
        <div className="flex h-[120px] w-[120px] items-center justify-center overflow-hidden rounded-full shadow-2xl ring-4 ring-white/20">
          <img src="/logo2.png" alt="CICT" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* ─── Title Bar ─── */}
      <div className="relative z-30 flex h-12 shrink-0 items-center justify-between glass-panel rounded-none border-t-0 border-x-0 border-b-white/50 px-5 text-sm dark:border-b-white/5 [-webkit-app-region:drag]">
        <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
          <span className="font-extrabold tracking-widest text-zinc-900 dark:text-zinc-50">VOTE 2026</span>
        </div>
        <div className="flex items-center gap-3 [-webkit-app-region:no-drag]">
          <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400 font-medium">{time}</span>
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
          <ThemeToggle />
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
          <InstallPrompt />
          <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700"></div>
          {/* Window controls */}
          <div className="group flex items-center gap-1.5 ml-1">
            <button aria-label="Close" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-red-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm cursor-pointer">
              <X className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
            </button>
            <button aria-label="Minimize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-yellow-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm cursor-pointer">
              <Minus className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
            </button>
            <button aria-label="Maximize" className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-zinc-300 hover:bg-green-500 dark:bg-zinc-600 transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-zinc-500 shadow-sm cursor-pointer">
              <Check className="h-2 w-2 text-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
            </button>
          </div>
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
              <Lock className="h-10 w-10 text-white drop-shadow-lg" strokeWidth={1.5} />
            </motion.div>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
              Welcome
            </h1>
            <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Sign in to vote
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <div className="h-px w-6 bg-maroon-500/50"></div>
              <ShieldCheck className="h-3.5 w-3.5 text-maroon-500 dark:text-maroon-400" strokeWidth={2} />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500 dark:text-maroon-400">Secured Terminal</span>
              <div className="h-px w-6 bg-maroon-500/50"></div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="mb-2.5 block text-sm font-bold text-zinc-700 dark:text-zinc-300">Voter ID</label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
                autoComplete="off"
                className="w-full rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-base text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 focus:shadow-[0_0_20px_rgba(244,63,110,0.15)] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/20"
                placeholder="e.g. IT-001"
                aria-describedby="identifier-error"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2.5 block text-sm font-bold text-zinc-700 dark:text-zinc-300">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 pr-12 text-base text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 focus:shadow-[0_0_20px_rgba(244,63,110,0.15)] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/20"
                  placeholder="Enter password"
                  aria-describedby="password-error"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                  {showPassword ? <EyeOff className="h-5 w-5" strokeWidth={1.5} /> : <Eye className="h-5 w-5" strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {error && (
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
              disabled={loading}
              aria-label={loading ? "Signing in" : "Sign in to voting system"}
              className={`
                group relative w-full overflow-hidden rounded-xl py-4 text-base font-extrabold transition-all duration-300 bg-gradient-to-r from-maroon-600 to-maroon-500 text-white shadow-lg glow-maroon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
                ${loading
                  ? "opacity-75 cursor-wait animate-pulse"
                  : "hover:from-maroon-500 hover:to-maroon-400 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                }
              `}
            >
              {/* Sweep animation */}
              {!loading && (
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />
              )}
              <span className="relative z-10">
                {loading ? "Signing in..." : "Sign In"}
              </span>
            </button>
            
            {onGoToRegister && (
              <div className="mt-6 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Don't have a Voter ID?{" "}
                <button
                  type="button"
                  onClick={onGoToRegister}
                  className="font-bold text-maroon-600 hover:text-maroon-500 dark:text-maroon-400 dark:hover:text-maroon-300 hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  Register here
                </button>
              </div>
            )}
          </form>

          <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">
            Secured voting terminal — unauthorized access prohibited
          </p>
        </motion.div>
      </div>
    </div>
  );
}

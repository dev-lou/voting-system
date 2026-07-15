import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useSystemClock } from "../hooks/useSystemClock";
import { ThemeToggle } from "../components/ThemeToggle";
import { Check, UserPlus, Eye, EyeOff, ShieldCheck } from "lucide-react";

interface RegisterPageProps {
  onGoToLogin: () => void;
}

export function RegisterPage({ onGoToLogin }: RegisterPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const time = useSystemClock();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const nameParts = fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || "";
      const lastName = nameParts.slice(1).join(" ") || "";

      const { error: rpcError } = await supabase.rpc("register_student", {
        p_first_name: firstName,
        p_last_name: lastName,
        p_gender: "",
        p_year_section: "",
        p_voter_id: email.trim().toLowerCase(),
        p_password: password,
      });

      if (rpcError) {
        if (
          rpcError.message.includes("unique") ||
          rpcError.message.includes("duplicate") ||
          rpcError.code === "23505"
        ) {
          setError("That Voter ID is already registered. Please sign in instead.");
        } else if (rpcError.message.includes("PASSWORD_TOO_SHORT")) {
          setError("Password must be at least 8 characters.");
        } else {
          setError(rpcError.message);
        }
        return;
      }

      setSuccess(true);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputClasses =
    "w-full rounded-xl border border-white/40 bg-white/60 px-5 py-3.5 text-base text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-4 focus:ring-maroon-500/10 focus:shadow-[0_0_20px_rgba(244,63,110,0.15)] disabled:opacity-50 dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/20";

  return (
    <div 
      className="relative flex h-screen w-screen flex-col overflow-hidden font-sans selection:bg-maroon-500/30 bg-cover bg-center"
      style={{ backgroundImage: 'url("/images.jpg")' }}
    >
      {/* ─── Dark Gradient Overlay & Blur ─── */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm dark:bg-black/60 z-0" />
      
      {/* ─── Ambient Background Orbs ─── */}
      <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[60vw] w-[60vw] rounded-full bg-maroon-500/20 blur-[160px] dark:bg-maroon-600/30 mix-blend-multiply dark:mix-blend-screen z-0" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-5%] h-[50vw] w-[50vw] rounded-full bg-gold-400/20 blur-[140px] dark:bg-indigo-600/30 mix-blend-multiply dark:mix-blend-screen z-0" />

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
          <div className="flex items-center gap-1.5 px-1 text-green-600 dark:text-green-500">
            <div className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75"></span>
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500"></span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">Online</span>
          </div>
        </div>
      </div>

      {/* ─── Main Content ─── */}
      <div className="relative z-10 flex flex-1 items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0, 1] }}
          className="w-full max-w-md overflow-hidden glass-panel rounded-3xl p-8 sm:p-10 shadow-2xl ring-1 ring-white/50 dark:ring-white/10"
        >
          {success ? (
            /* Success state */
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-green-600 shadow-xl border border-white/20"
              >
                <Check className="h-10 w-10 text-white drop-shadow-lg" strokeWidth={2} />
              </motion.div>
              <h2 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
                Registration Complete
              </h2>
              <div className="mt-6 rounded-xl border border-maroon-500/20 bg-maroon-500/5 p-4 dark:border-maroon-500/10 dark:bg-maroon-500/10">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1">Your Voter ID is:</p>
                <p className="text-xl font-mono font-bold tracking-wider text-maroon-700 dark:text-maroon-400">{email}</p>
              </div>
              <p className="mt-5 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Please save this ID. You will use it to sign in to the voting terminal.
              </p>
              <button
                type="button"
                onClick={onGoToLogin}
                className="mt-8 group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-maroon-600 to-maroon-500 py-4 text-base font-extrabold text-white shadow-lg glow-maroon transition-all duration-300 hover:scale-[1.02] hover:from-maroon-500 hover:to-maroon-400 active:scale-[0.98] cursor-pointer"
              >
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />
                <span className="relative z-10">Proceed to Sign In</span>
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="mb-6 flex justify-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                    className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-xl glow-maroon border border-white/20"
                  >
                    <UserPlus className="h-9 w-9 text-white drop-shadow-lg translate-x-1" strokeWidth={1.5} />
                  </motion.div>
                </div>
                
                <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
                  Register
                </h1>
                <p className="mt-3 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Create your voter credentials
                </p>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <div className="h-px w-6 bg-maroon-500/50"></div>
                  <ShieldCheck className="h-3.5 w-3.5 text-maroon-500 dark:text-maroon-400" strokeWidth={2} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-maroon-500 dark:text-maroon-400">Secured Terminal</span>
                  <div className="h-px w-6 bg-maroon-500/50"></div>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="name"
                    className={inputClasses}
                    placeholder="e.g. Juan dela Cruz"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    Voter ID
                  </label>
                  <input
                    id="reg-email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="username"
                    className={inputClasses}
                    placeholder="e.g. IT-001"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="reg-password" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="reg-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        autoComplete="new-password"
                        className={inputClasses + " pr-10"}
                        placeholder="Min. 8 chars"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                        {showPassword ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-2 block text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                      Confirm
                    </label>
                    <input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      autoComplete="new-password"
                      className={inputClasses}
                      placeholder="Repeat it"
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="mt-2 rounded-xl border border-red-300/50 bg-red-500/10 px-5 py-3.5 text-sm font-semibold text-red-600 dark:border-red-700/50 dark:bg-red-900/20 dark:text-red-400 backdrop-blur-md"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`
                    mt-4 group relative w-full overflow-hidden rounded-xl py-4 text-base font-extrabold transition-all duration-300 bg-gradient-to-r from-maroon-600 to-maroon-500 text-white shadow-lg glow-maroon focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500
                    ${loading
                      ? "opacity-75 cursor-wait animate-pulse"
                      : "hover:from-maroon-500 hover:to-maroon-400 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    }
                  `}
                >
                  {!loading && (
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[sweep_1.5s_ease-in-out_infinite]" />
                  )}
                  <span className="relative z-10">
                    {loading ? "Registering..." : "Create Account"}
                  </span>
                </button>
                
                <div className="mt-6 text-center text-sm font-medium text-zinc-600 dark:text-zinc-400">
                  Already registered?{" "}
                  <button
                    type="button"
                    onClick={onGoToLogin}
                    disabled={loading}
                    className="font-bold text-maroon-600 hover:text-maroon-500 dark:text-maroon-400 dark:hover:text-maroon-300 hover:underline underline-offset-2 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Sign in here
                  </button>
                </div>
              </form>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}

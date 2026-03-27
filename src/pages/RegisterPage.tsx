import { useState, type FormEvent } from "react";
import { supabase } from "../lib/supabase";
import { useSystemClock } from "../hooks/useSystemClock";
import { ThemeToggle } from "../components/ThemeToggle";
import { Check, User } from "lucide-react";

interface RegisterPageProps {
  onGoToLogin: () => void;
}

/**
 * Student self-registration page.
 * Desktop app aesthetic, theme-aware.
 */
export function RegisterPage({ onGoToLogin }: RegisterPageProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      const { error: rpcError } = await supabase.rpc("student_register", {
        p_full_name: fullName.trim(),
        p_email: email.trim().toLowerCase(),
        p_password: password,
      });

      if (rpcError) {
        if (
          rpcError.message.includes("unique") ||
          rpcError.message.includes("duplicate") ||
          rpcError.code === "23505"
        ) {
          setError(
            "That email is already registered. Please sign in instead."
          );
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
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      {/* Mini title bar */}
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-4 text-xs dark:border-zinc-800 dark:bg-zinc-900">
        <span className="font-semibold tracking-wider text-maroon-700 dark:text-maroon-500">
          VOTE — Registration
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono tabular-nums text-zinc-500 dark:text-zinc-400">{time}</span>
          <ThemeToggle />
        </div>
      </div>

      {/* Centered card */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto py-8">
        <div className="w-full max-w-sm">
          {success ? (
            /* Success state */
            <div className="text-center">
              <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30">
                <Check
                  className="h-6 w-6 text-green-600 dark:text-green-400"
                  strokeWidth={2}
                />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Registration Complete
              </h2>
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Your account has been created. You can now sign in at the voting kiosk.
              </p>
              <button
                type="button"
                onClick={onGoToLogin}
                className="mt-6 w-full rounded-lg bg-maroon-700 py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-maroon-800 cursor-pointer dark:bg-maroon-600 dark:hover:bg-maroon-700"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800">
                  <User
                    className="h-6 w-6 text-maroon-700 dark:text-maroon-500"
                    strokeWidth={1.5}
                  />
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                  Voter Registration
                </h1>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                  Create your account to participate in the election.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="fullName"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
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
                    placeholder="Juan dela Cruz"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-email"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Email
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="email"
                    className={inputClasses}
                    placeholder="you@university.edu"
                  />
                </div>

                <div>
                  <label
                    htmlFor="reg-password"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Password
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className={inputClasses}
                    placeholder="Min. 8 characters"
                  />
                </div>

                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    autoComplete="new-password"
                    className={inputClasses}
                    placeholder="Re-enter password"
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
                  {loading ? "Creating Account..." : "Register"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">Already registered? </span>
                <button
                  type="button"
                  onClick={onGoToLogin}
                  disabled={loading}
                  className="text-sm font-medium text-maroon-600 hover:text-maroon-700 disabled:opacity-50 cursor-pointer dark:text-maroon-500 dark:hover:text-maroon-400"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle } from "lucide-react";
import { Toaster } from "sonner";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VotingPage } from "./pages/VotingPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { useBallotStore } from "./stores/ballotStore";
import { ThemeProvider } from "./utils/theme.tsx";
import { isConfigured } from "./lib/supabase";
import type { Student } from "./lib/types";

export const ADMIN_SESSION_KEY = "admin-email";
export const STUDENT_SESSION_KEY = "student-session";

type AppState = "loading" | "login" | "register" | "voting" | "admin";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const resetBallot = useBallotStore((s) => s.reset);

  useEffect(() => {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY)) {
      setAppState("admin");
      return;
    }
    const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
    if (raw) {
      try {
        const student: Student = JSON.parse(raw);
        const hasPassword = useBallotStore.getState().voterPassword !== "";
        
        // Only allow them to stay on the voting page if they haven't voted AND they have their password in secure memory.
        // If they refreshed the page, the in-memory password is wiped, so we must force them to log in again for security.
        if (!student.has_voted && hasPassword) {
          setAppState("voting");
          return;
        }
      } catch {
        // Fall through to cleanup
      }
      // If we reach here, either they voted already, or they lost their secure memory (refreshed). 
      // Force logout for strict security.
      sessionStorage.removeItem(STUDENT_SESSION_KEY);
      useBallotStore.getState().reset();
    }
    setAppState("login");
  }, []);

  const handleAuthenticated = useCallback((role: "admin" | "voter") => {
    setAppState(role === "admin" ? "admin" : "voting");
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(STUDENT_SESSION_KEY);
    resetBallot();
    setAppState("login");
  }, [resetBallot]);

  const handleGoToLogin = useCallback(() => setAppState("login"), []);

  // Graceful error if Supabase is not configured
  if (!isConfigured) {
    return (
      <ThemeProvider>
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-8">
          <div className="max-w-md text-center glass-panel rounded-3xl px-10 py-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20">
              <AlertTriangle className="h-8 w-8 text-red-500" strokeWidth={1.5} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mb-3">
              Configuration Missing
            </h1>
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 leading-relaxed">
              The voting system needs your Supabase project credentials to connect.
            </p>
            <div className="mt-6 rounded-xl bg-zinc-100 dark:bg-zinc-800 p-5 text-left font-mono text-xs">
              <p className="text-zinc-600 dark:text-zinc-400 mb-2">1. Copy <span className="font-bold text-zinc-900 dark:text-zinc-200">.env.example</span> to <span className="font-bold text-zinc-900 dark:text-zinc-200">.env</span></p>
              <p className="text-zinc-600 dark:text-zinc-400 mb-2">2. Fill in your Supabase URL &amp; anon key</p>
              <p className="text-zinc-600 dark:text-zinc-400">3. Restart the dev server</p>
            </div>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  const renderContent = () => {
    if (appState === "loading") {
      return (
        <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
          <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-maroon-500/5 blur-[140px] dark:bg-maroon-600/10" />
          <div className="flex flex-col items-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-xl glow-maroon animate-pulse border border-white/20">
              <span className="text-lg font-extrabold text-white">V</span>
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-zinc-400 dark:text-zinc-600">Loading VOTE 2026</p>
          </div>
        </div>
      );
    }

    if (appState === "login") {
      return (
        <LoginPage
          onAuthenticated={handleAuthenticated}
          onGoToRegister={() => setAppState("register")}
        />
      );
    }

    if (appState === "register") {
      return <RegisterPage onGoToLogin={handleGoToLogin} />;
    }

    if (appState === "admin") {
      return <AdminDashboard onLogout={handleLogout} />;
    }

    return <VotingPage onLogout={handleLogout} />;
  };

  return (
    <ThemeProvider>
      <Toaster position="bottom-right" richColors theme="system" closeButton />
      {renderContent()}
    </ThemeProvider>
  );
}

export default App;

import { useState, useEffect, useCallback } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VotingPage } from "./pages/VotingPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { useBallotStore } from "./stores/ballotStore";
import { ThemeProvider } from "./utils/theme.tsx";
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
        if (!student.has_voted) {
          setAppState("voting");
          return;
        }
      } catch {
        sessionStorage.removeItem(STUDENT_SESSION_KEY);
      }
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

  return <ThemeProvider>{renderContent()}</ThemeProvider>;
}

export default App;

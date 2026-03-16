import { useState, useEffect, useCallback } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { VotingPage } from "./pages/VotingPage";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { useBallotStore } from "./stores/ballotStore";
import { ThemeProvider } from "./utils/theme.tsx";
import type { Student } from "./lib/types";

// ---------------------------------------------------------------------------
// Sessions are stored entirely in sessionStorage — no Supabase Auth at all.
// ---------------------------------------------------------------------------
export const ADMIN_SESSION_KEY = "admin-email";
export const STUDENT_SESSION_KEY = "student-session";

// ---------------------------------------------------------------------------
// App-level state machine
// ---------------------------------------------------------------------------
// loading   → checking existing sessions on mount
// login     → no session; show unified login form
// register  → show voter self-registration form
// voting    → authenticated student
// admin     → authenticated admin
// ---------------------------------------------------------------------------
type AppState = "loading" | "login" | "register" | "voting" | "admin";

function App() {
  const [appState, setAppState] = useState<AppState>("loading");
  const resetBallot = useBallotStore((s) => s.reset);

  useEffect(() => {
    // Admin session
    if (sessionStorage.getItem(ADMIN_SESSION_KEY)) {
      setAppState("admin");
      return;
    }
    // Student session
    const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
    if (raw) {
      try {
        const student: Student = JSON.parse(raw);
        if (!student.has_voted) {
          setAppState("voting");
          return;
        }
      } catch {
        // Corrupt data — clear it
        sessionStorage.removeItem(STUDENT_SESSION_KEY);
      }
    }
    setAppState("login");
  }, []);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleAuthenticated = useCallback((role: "admin" | "voter") => {
    setAppState(role === "admin" ? "admin" : "voting");
  }, []);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(STUDENT_SESSION_KEY);
    resetBallot();
    setAppState("login");
  }, [resetBallot]);

  const handleGoToRegister = useCallback(() => setAppState("register"), []);
  const handleGoToLogin = useCallback(() => setAppState("login"), []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const renderContent = () => {
    if (appState === "loading") {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
          <svg className="h-8 w-8 animate-spin text-maroon-700" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      );
    }

    if (appState === "login") {
      return (
        <LoginPage
          onAuthenticated={handleAuthenticated}
          onGoToRegister={handleGoToRegister}
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

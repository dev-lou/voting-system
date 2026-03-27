import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, AlertTriangle, Clock, Check, X, FileText, Clipboard } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useElection } from "../hooks/useElection";
import { useBallotStore } from "../stores/ballotStore";
import { VotingLayout } from "../components/VotingLayout";
import { Confetti } from "../components/Confetti";
import { sounds } from "../utils/sounds";
import { STUDENT_SESSION_KEY } from "../App";
import type { Student } from "../lib/types";

interface VotingPageProps {
  onLogout: () => void;
}

export function VotingPage({ onLogout }: VotingPageProps) {
  const { election, positions, loading, error } = useElection();
  const { isOnline } = useNetworkStatus();
  const buildPayload = useBallotStore((s) => s.buildBallotPayload);
  const setShowReview = useBallotStore((s) => s.setShowReview);

  const studentRaw = sessionStorage.getItem(STUDENT_SESSION_KEY);
  const student: Student | null = studentRaw ? (JSON.parse(studentRaw) as Student) : null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [copied, setCopied] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [abstainedPositions, setAbstainedPositions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (submitSuccess) {
      sounds.playSuccess();
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [submitSuccess, onLogout]);

  if (!student) {
    onLogout();
    return null;
  }

  const handleAbstain = useCallback((positionId: string) => {
    setAbstainedPositions((prev) => {
      const next = new Set(prev);
      if (next.has(positionId)) {
        next.delete(positionId);
      } else {
        next.add(positionId);
      }
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!student || !election || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = buildPayload(positions.map((p) => p.id));

      const { error: rpcError } = await supabase.rpc("submit_ballot", {
        p_student_id: student.id,
        p_election_id: election.id,
        p_selections: payload,
      });

      if (rpcError) {
        if (rpcError.message.includes("ALREADY_VOTED")) {
          setSubmitError("Your ballot has already been recorded.");
        } else {
          setSubmitError(rpcError.message);
        }
        return;
      }

      setSubmitSuccess(true);
      const code = "IT-" + crypto.randomUUID().slice(0, 4).toUpperCase();
      setConfirmationCode(code);

      // Store confirmation code in database for admin tracking
      const { error: codeErr } = await supabase
        .from("students")
        .update({ confirmation_code: code })
        .eq("id", student.id);
      if (codeErr) {
        console.error("Failed to save confirmation code:", codeErr.message);
      }

      // Auto-download receipt (anonymous — no voter name)
      const votes: string[] = [];
      positions.forEach(pos => {
        const selected = useBallotStore.getState().getSelections(pos.id);
        pos.candidates.forEach(c => {
          if (selected.has(c.id)) {
            votes.push(`${pos.title}: ${c.full_name}`);
          }
        });
      });

      const receiptText = `VOTE CONFIRMATION
==================
Election: ${election?.name ?? "Election"}
Date: ${new Date().toLocaleString()}
------------------
Your votes:
${votes.length > 0 ? votes.join('\n') : 'No votes cast'}
------------------
Confirmation: ${code}
Status: RECORDED
==================`;

      const blob = new Blob([receiptText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vote-receipt-${code}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setShowReview(false);
    } catch {
      setSubmitError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [student, election, positions, isSubmitting, buildPayload, setShowReview]);

  // ─── Premium Loading State ───
  if (loading) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        <div className="pointer-events-none absolute top-[-20%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-maroon-500/5 blur-[140px] dark:bg-maroon-600/10" />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex flex-col items-center gap-6"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-xl glow-maroon border border-white/20"
          >
            <Loader2 className="h-8 w-8 text-white animate-spin" />
          </motion.div>
          <div className="text-center">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Loading Ballot</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600">Preparing your voting session</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Premium Error State ───
  if (error) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[40vw] w-[40vw] rounded-full bg-red-500/5 blur-[120px] dark:bg-red-600/10" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative z-10 text-center glass-panel rounded-3xl px-12 py-10 max-w-md"
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400" strokeWidth={1.5} />
          </div>
          <p className="mb-6 text-sm font-semibold text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={onLogout}
            className="rounded-xl glass-panel px-6 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            Return to Login
          </button>
        </motion.div>
      </div>
    );
  }

  // ─── Election Scheduling States ───
  if (election) {
    const now = new Date();
    if (election.starts_at && new Date(election.starts_at) > now) {
      return (
        <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
          <div className="pointer-events-none absolute top-[-20%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-maroon-500/5 blur-[140px] dark:bg-maroon-600/10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 text-center glass-panel rounded-3xl px-12 py-10 max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-200/50 to-zinc-100/20 border border-white/40 dark:from-zinc-800/50 dark:to-zinc-900/40 dark:border-white/10 shadow-lg">
              <Clock className="h-8 w-8 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Election hasn't started</p>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Voting begins {new Date(election.starts_at).toLocaleDateString()} at {new Date(election.starts_at).toLocaleTimeString()}</p>
            <button onClick={onLogout} className="mt-6 rounded-xl glass-panel px-6 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:scale-105 active:scale-95 cursor-pointer">Return to Login</button>
          </motion.div>
        </div>
      );
    }
    if (election.ends_at && new Date(election.ends_at) < now) {
      return (
        <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
          <div className="pointer-events-none absolute bottom-[-15%] left-[-5%] h-[50vw] w-[50vw] rounded-full bg-maroon-500/5 blur-[140px] dark:bg-maroon-600/10" />
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative z-10 text-center glass-panel rounded-3xl px-12 py-10 max-w-md">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-200/50 to-zinc-100/20 border border-white/40 dark:from-zinc-800/50 dark:to-zinc-900/40 dark:border-white/10 shadow-lg">
              <Clock className="h-8 w-8 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />
            </div>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Election has ended</p>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">Voting closed {new Date(election.ends_at).toLocaleDateString()} at {new Date(election.ends_at).toLocaleTimeString()}</p>
            <button onClick={onLogout} className="mt-6 rounded-xl glass-panel px-6 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 transition-all hover:scale-105 active:scale-95 cursor-pointer">Return to Login</button>
          </motion.div>
        </div>
      );
    }
  }

  // ─── Premium Success State ───
  if (submitSuccess) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        <Confetti />
        {/* Ambient Success Glow */}
        <div className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 h-[50vw] w-[50vw] rounded-full bg-maroon-500/10 blur-[160px] dark:bg-maroon-600/20" />
        <div className="pointer-events-none absolute bottom-[-10%] right-0 h-[40vw] w-[40vw] rounded-full bg-gold-400/10 blur-[120px] dark:bg-gold-400/5" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="relative z-10 text-center glass-panel rounded-3xl px-16 py-14 max-w-lg shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)]"
        >
          {/* Animated Checkmark */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
            className="mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-maroon-500 to-maroon-700 shadow-xl glow-maroon border border-white/20"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
            >
              <Check className="h-12 w-12 text-white drop-shadow-lg" strokeWidth={3} />
            </motion.div>
          </motion.div>

          {confirmationCode && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mb-6"
            >
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-500 mb-2">Confirmation Code</p>
              <div className="flex items-center justify-center gap-3">
                <p className="font-mono text-4xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-maroon-600 to-maroon-400">
                  {confirmationCode}
                </p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(confirmationCode);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700 transition-all cursor-pointer dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700 dark:hover:text-zinc-300"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" strokeWidth={2} />
                  ) : (
                    <Clipboard className="h-4 w-4" strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {copied && <p className="mt-1 text-xs font-medium text-green-600 dark:text-green-400">Copied!</p>}
            </motion.div>
          )}

          <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400">
            Vote Submitted!
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Thank you for participating in the 2026 election
          </p>

          <div className="mt-4 flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-maroon-50 px-5 py-3 dark:bg-maroon-900/20">
              <FileText className="h-4 w-4 text-maroon-600 dark:text-maroon-400" strokeWidth={2} />
              <span className="text-sm font-medium text-maroon-700 dark:text-maroon-300">Receipt downloaded</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-zinc-400 dark:text-zinc-500">
            Logging out in {timeLeft}s...
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Main Voting Interface ───
  return (
    <>
      <VotingLayout
        positions={positions}
        electionName={election?.name ?? "Election"}
        isOnline={isOnline}
        userEmail={student.email ?? undefined}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        abstainedPositions={abstainedPositions}
        onAbstain={handleAbstain}
      />

      {/* Premium Error Toast */}
      {submitError && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed bottom-6 right-6 z-50 glass-panel rounded-2xl p-5 shadow-xl max-w-sm border-red-500/20"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-600 dark:text-red-400">Submission Error</p>
              <p className="mt-1 text-xs font-medium text-red-500/80 dark:text-red-400/80">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="h-3.5 w-3.5" strokeWidth={2.5} />
            </button>
          </div>
        </motion.div>
      )}
    </>
  );
}

import { useState, useCallback, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { useElection } from "../hooks/useElection";
import { useBallotStore } from "../stores/ballotStore";
import { VotingLayout } from "../components/VotingLayout";
import { Confetti } from "../components/Confetti";
import { VoteReceipt } from "../components/VoteReceipt";
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
  const [timeLeft, setTimeLeft] = useState(5);

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
      setShowReview(false);
    } catch {
      setSubmitError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  }, [student, election, positions, isSubmitting, buildPayload, setShowReview]);

  // Loading
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-maroon-700 dark:text-maroon-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30">
            <svg className="h-6 w-6 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={onLogout}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Success
  if (submitSuccess) {
    return (
      <div className="relative flex h-screen w-screen items-center justify-center bg-zinc-100 dark:bg-zinc-950">
        <Confetti />
        <div className="relative z-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-maroon-700 dark:bg-maroon-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Vote Submitted!
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Thank you for voting
          </p>
          <div className="mt-6">
            <VoteReceipt
              positions={positions}
              electionName={election?.name ?? ""}
              studentName={student.full_name}
            />
          </div>
          <p className="mt-6 text-xs text-zinc-400 dark:text-zinc-500">
            Logging out in {timeLeft} second{timeLeft !== 1 ? "s" : ""}...
          </p>
        </div>
      </div>
    );
  }

  // Main voting interface
  return (
    <>
      <VotingLayout
        positions={positions}
        electionName={election?.name ?? "Election"}
        isOnline={isOnline}
        userEmail={student.email ?? undefined}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
      />

      {submitError && (
        <div className="fixed bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-white p-4 shadow-lg dark:border-red-800 dark:bg-zinc-900">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">Error</p>
              <p className="mt-0.5 text-xs text-red-500 dark:text-red-400/80">{submitError}</p>
            </div>
            <button
              onClick={() => setSubmitError(null)}
              className="shrink-0 text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </>
  );
}

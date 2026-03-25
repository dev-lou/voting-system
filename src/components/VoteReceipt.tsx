import { useBallotStore } from "../stores/ballotStore";
import type { PositionWithCandidates } from "../lib/types";

interface VoteReceiptProps {
  positions: PositionWithCandidates[];
  electionName: string;
  studentName: string;
  confirmationCode?: string;
}

/**
 * 2026 Premium Vote Receipt
 * Download button styled as a sleek glass action.
 */
export function VoteReceipt({ positions, electionName, studentName, confirmationCode }: VoteReceiptProps) {
  const getSelections = useBallotStore((s) => s.getSelections);

  const handleDownload = () => {
    const votes: string[] = [];
    positions.forEach(pos => {
      const selected = getSelections(pos.id);
      pos.candidates.forEach(c => {
        if (selected.has(c.id)) {
          votes.push(`${pos.title}: ${c.full_name}`);
        }
      });
    });

    let receipt = `VOTE CONFIRMATION
==================
Election: ${electionName}
Date: ${new Date().toLocaleString()}
Voter: ${studentName}
------------------
Your votes:
${votes.length > 0 ? votes.join('\n') : 'No votes cast'}
------------------`;

    if (confirmationCode) {
      receipt += `\nConfirmation: ${confirmationCode}`;
    }

    receipt += `
Status: RECORDED
==================`;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vote-receipt-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleDownload}
        onKeyDown={(e) => e.key === 'Enter' && handleDownload()}
        aria-label="Download vote receipt"
        className="group relative flex items-center gap-3 glass-panel rounded-xl px-6 py-3.5 text-sm font-bold transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-maroon-500 shadow-lg"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-200/60 dark:bg-zinc-700/60 transition-colors group-hover:bg-maroon-100 dark:group-hover:bg-maroon-900/30">
          <svg className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-hover:text-maroon-600 dark:group-hover:text-maroon-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <span className="text-zinc-800 dark:text-zinc-200 group-hover:text-maroon-700 dark:group-hover:text-maroon-400 transition-colors">
          Download Receipt
        </span>
      </button>
    </div>
  );
}

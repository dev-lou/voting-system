import { useBallotStore } from "../stores/ballotStore";
import type { PositionWithCandidates } from "../lib/types";

interface VoteReceiptProps {
  positions: PositionWithCandidates[];
  electionName: string;
  studentName: string;
}

export function VoteReceipt({ positions, electionName, studentName }: VoteReceiptProps) {
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

    const receipt = `VOTE CONFIRMATION
==================
Election: ${electionName}
Date: ${new Date().toLocaleString()}
Voter: ${studentName}
------------------
Your votes:
${votes.length > 0 ? votes.join('\n') : 'No votes cast'}
------------------
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
        className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Download Receipt
      </button>
    </div>
  );
}

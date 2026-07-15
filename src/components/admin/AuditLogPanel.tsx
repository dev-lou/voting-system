import { useState, useEffect } from "react";
import { getAuditLog, clearAuditLog, type AuditEntry } from "../../utils/auditLog";
import { History, Trash2, FileX } from "lucide-react";

export function AuditLogPanel() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setLogs(getAuditLog());
  }, []);

  const handleClear = () => {
    clearAuditLog();
    setLogs([]);
    setShowConfirm(false);
  };

  return (
    <div className="flex h-full flex-col bg-zinc-50/50 dark:bg-[#09090b]">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-3">
              <History className="h-8 w-8 text-blue-500" />
              Audit Log
            </h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Complete history of all administrative actions.
            </p>
          </div>
          {logs.length > 0 && (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-600 transition-colors hover:bg-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Clear History
            </button>
          )}
        </div>

        <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-zinc-200/50 dark:bg-zinc-950/50 dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] dark:ring-white/5 overflow-hidden">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 opacity-50">
              <FileX className="mb-4 h-16 w-16 text-zinc-400 dark:text-zinc-600" strokeWidth={1} />
              <p className="text-sm font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">No actions recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-white/5">
              {logs.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-6 hover:bg-zinc-50/50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-6">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-900 ring-1 ring-zinc-200/50 dark:ring-white/10">
                      <span className="text-sm font-black text-zinc-500 dark:text-zinc-400">{entry.actor.substring(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="text-base font-bold text-zinc-900 dark:text-zinc-100">{entry.action}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">{entry.details}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                      {new Date(entry.timestamp).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="mt-1 text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modern Confirmation Modal */}
      {showConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm dark:bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-2xl ring-1 ring-zinc-200 dark:bg-[#09090b] dark:ring-white/10 dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-in zoom-in-95 duration-200">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 dark:bg-red-500/10 ring-1 ring-red-100 dark:ring-red-500/20">
              <Trash2 className="h-8 w-8 text-red-500 dark:text-red-400" strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-black tracking-tight text-zinc-900 dark:text-white">Clear Audit Log?</h3>
            <p className="mt-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. This will permanently delete all local administrative history records.
            </p>
            <div className="mt-8 flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-xl bg-zinc-100 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleClear}
                className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white transition-colors hover:bg-red-600 shadow-lg shadow-red-500/20 cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

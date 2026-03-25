import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Student } from "../../lib/types";
import { addAuditEntry } from "../../utils/auditLog";
import { CustomSelect } from "../CustomSelect";

export function VotersPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [votedFilter, setVotedFilter] = useState("all");
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; duplicates: number; failed: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("students")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else {
      setStudents(data ?? []);
      setFiltered(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    let result = students;
    const q = search.toLowerCase().trim();
    if (q) {
      result = result.filter(s => 
        s.full_name.toLowerCase().includes(q) || 
        (s.email ?? "").toLowerCase().includes(q)
      );
    }
    if (votedFilter === "voted") {
      result = result.filter(s => s.has_voted);
    } else if (votedFilter === "not-voted") {
      result = result.filter(s => !s.has_voted);
    }
    setFiltered(result);
  }, [search, students, votedFilter]);

  async function handleResetVote(id: string, name: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_reset_voter", {
      p_admin_email: adminEmail,
      p_student_id: id,
    });
    if (err) setError(err.message);
    setResetConfirm(null);
    setSaving(false);
    await load();
    addAuditEntry(adminEmail, "Reset vote for", name);
  }

  async function handleAddVoter(e: FormEvent) {
    e.preventDefault();
    setAddError(null);
    
    if (!newName.trim()) { setAddError("Name required"); return; }
    if (!newEmail.trim()) { setAddError("Email required"); return; }
    if (!newPassword || newPassword.length < 6) { setAddError("Password min 6 chars"); return; }
    
    setAdding(true);
    try {
      const { error: rpcError } = await supabase.rpc("student_register", {
        p_full_name: newName.trim(),
        p_email: newEmail.trim().toLowerCase(),
        p_password: newPassword,
      });

      if (rpcError) {
        if (rpcError.message.includes("unique") || rpcError.message.includes("duplicate")) {
          setAddError("Email already exists");
        } else {
          setAddError(rpcError.message);
        }
        return;
      }

      setShowAdd(false);
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await load();
      addAuditEntry(adminEmail, "Added voter", newName.trim());
    } catch {
      setAddError("Failed to add voter");
    } finally {
      setAdding(false);
    }
  }

  async function handleCsvImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setImportError("Please select a .csv file.");
      return;
    }

    setImporting(true);
    setImportError(null);
    setImportResults(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      
      const startIndex = lines[0]?.toLowerCase().includes("name") || lines[0]?.toLowerCase().includes("email") ? 1 : 0;
      const rows = lines.slice(startIndex);

      setImportTotal(rows.length);
      let success = 0, duplicates = 0, failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 3 || !cols[0] || !cols[1] || !cols[2]) {
          failed++;
          setImportProgress(i + 1);
          continue;
        }

        const [fullName, email, password] = cols;

        if (password.length < 8) {
          failed++;
          setImportProgress(i + 1);
          continue;
        }

        try {
          const { error: rpcError } = await supabase.rpc("student_register", {
            p_full_name: fullName,
            p_email: email,
            p_password: password,
          });

          if (rpcError) {
            if (rpcError.message.includes("unique") || rpcError.message.includes("duplicate")) {
              duplicates++;
            } else {
              failed++;
            }
          } else {
            success++;
          }
        } catch {
          failed++;
        }

        setImportProgress(i + 1);
      }

      setImportResults({ success, duplicates, failed });
      await load();
      addAuditEntry(adminEmail, "CSV import", `${success} added, ${duplicates} duplicates, ${failed} failed`);
    } catch {
      setImportError("Failed to read CSV file.");
    } finally {
      setImporting(false);
    }
  }

  function handleExportPdf() {
    const exportData = filtered.length > 0 ? filtered : students;
    const rows = exportData.map(s => 
      `<tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:8px 16px">${s.full_name}</td>
        <td style="padding:8px 16px">${s.email ?? '—'}</td>
        <td style="padding:8px 16px">${s.has_voted ? 'Yes' : 'No'}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><title>Voters Report</title>
<style>body{font-family:system-ui,sans-serif;padding:40px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 16px;border-bottom:2px solid #18181b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#71717a}td{font-size:14px;color:#18181b}</style>
</head><body>
<h1 style="font-size:20px;margin-bottom:4px">Voters Report</h1>
<p style="color:#71717a;font-size:14px;margin-bottom:24px">Generated ${new Date().toLocaleString()} · ${exportData.length} voters · ${exportData.filter(s => s.has_voted).length} voted</p>
<table><thead><tr><th>Name</th><th>Email</th><th>Voted</th></tr></thead><tbody>${rows}</tbody></table>
</body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900 py-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Voters</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage voter accounts and track participation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search voters by name or email..."
            className="w-64 rounded-xl border border-white/40 bg-white/60 px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 outline-none backdrop-blur-md transition-all duration-300 focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 focus:shadow-[0_0_12px_rgba(244,63,110,0.1)] dark:border-white/10 dark:bg-zinc-800/60 dark:text-zinc-100 dark:placeholder-zinc-500"
          />
          <div className="w-40 relative z-40">
            <CustomSelect
              value={votedFilter}
              onChange={setVotedFilter}
              options={[
                { value: "all", label: "All Voters" },
                { value: "voted", label: "Voted" },
                { value: "not-voted", label: "Not Voted" }
              ]}
              placeholder="Filter by voting status"
            />
          </div>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowImport(false); }}
            className="px-4 py-2 bg-maroon-700 text-white rounded-lg text-sm font-medium hover:bg-maroon-800"
          >
            {showAdd ? "Cancel" : "+ Add Voter"}
          </button>
          <button
            type="button"
            onClick={() => { setShowImport(!showImport); setShowAdd(false); setImportError(null); setImportResults(null); }}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 cursor-pointer dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Import CSV
          </button>
          <button
            onClick={handleExportPdf}
            className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 cursor-pointer dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Export PDF
          </button>
        </div>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">Add New Voter</h3>
          <form onSubmit={handleAddVoter} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Full Name"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Password"
              className="w-36 rounded-lg border border-zinc-300 px-3 py-2 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={adding}
              className="px-5 py-2 bg-maroon-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add"}
            </button>
          </form>
          {addError && <p className="mt-2 text-red-600 text-sm">{addError}</p>}
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Import Students from CSV</h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            CSV format: full_name,email,password (one student per line, passwords must be 8+ chars)
          </p>
          <div className="flex items-center gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvImport}
              disabled={importing}
              className="text-sm text-zinc-600 dark:text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-50 dark:file:border-zinc-600 dark:file:bg-zinc-800 dark:file:text-zinc-300"
            />
          </div>
          {importing && (
            <div className="mt-3">
              <div className="mb-1 flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                <span>Importing...</span>
                <span>{importProgress} / {importTotal}</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700">
                <div
                  className="h-2 rounded-full bg-maroon-700 transition-all dark:bg-maroon-600"
                  style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {importResults && (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Import Complete</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {importResults.success} added · {importResults.duplicates} duplicates · {importResults.failed} failed
              </p>
            </div>
          )}
          {importError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{importError}</p>}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-6 text-zinc-500 dark:text-zinc-400">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
              <svg className="h-7 w-7 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              No voters yet
            </p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Create your first voter to get started.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 shadow-sm dark:bg-zinc-900/50 dark:border-white/10 dark:backdrop-blur-md">
              <tr>
                <th className="text-left px-6 pt-4 pb-3 font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="text-left px-6 pt-4 pb-3 font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="text-left px-6 pt-4 pb-3 font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voted</th>
                <th className="text-right px-6 pt-4 pb-3 font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer">
                  <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{s.full_name}</td>
                  <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{s.email ?? "—"}</td>
                  <td className="px-6 py-4">
                    <span className={`${s.has_voted ? 'rounded-full bg-maroon-100 px-2.5 py-0.5 text-xs font-semibold text-maroon-700 dark:bg-maroon-500/20 dark:text-maroon-400' : 'rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {s.has_voted ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="flex items-center gap-1.5 justify-end px-6 py-4">
                    {s.has_voted && (
                      resetConfirm === s.id ? (
                        <>
                          <button onClick={() => handleResetVote(s.id, s.full_name)} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer">Confirm</button>
                          <button onClick={() => setResetConfirm(null)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
                        </>
                      ) : (
                        <button onClick={() => setResetConfirm(s.id)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-800 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 cursor-pointer transition-colors duration-200">
                          Reset
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

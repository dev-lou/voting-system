import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Student } from "../../lib/types";
import { addAuditEntry } from "../../utils/auditLog";
import { CustomSelect } from "../CustomSelect";
import { X, Eye, EyeOff, Users } from "lucide-react";

export function VotersPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [votedFilter, setVotedFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newGender, setNewGender] = useState("Male");
  const [newYearSection, setNewYearSection] = useState("");
  const [newVoterId, setNewVoterId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Student | null>(null);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editGender, setEditGender] = useState("");
  const [editYearSection, setEditYearSection] = useState("");
  const [editVoterId, setEditVoterId] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
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
        (s.voter_id ?? "").toLowerCase().includes(q) ||
        s.full_name.toLowerCase().includes(q) ||
        (s.first_name ?? "").toLowerCase().includes(q) ||
        (s.last_name ?? "").toLowerCase().includes(q) ||
        (s.confirmation_code ?? "").toLowerCase().includes(q)
      );
    }
    if (votedFilter === "voted") {
      result = result.filter(s => s.has_voted);
    } else if (votedFilter === "not-voted") {
      result = result.filter(s => !s.has_voted);
    }
    setFiltered(result);
  }, [search, students, votedFilter]);

  function openEditVoter(s: Student) {
    setEditingVoter(s);
    setEditFirstName(s.first_name ?? "");
    setEditLastName(s.last_name ?? "");
    setEditGender(s.gender ?? "Male");
    setEditYearSection(s.year_section ?? "");
    setEditVoterId(s.voter_id ?? "");
    setEditError(null);
    setShowEdit(true);
  }

  async function handleResetVote(id: string, name: string) {
    const { error: err } = await supabase.rpc("admin_reset_voter", {
      p_admin_email: adminEmail,
      p_student_id: id,
    });
    if (err) setError(err.message);
    await load();
    addAuditEntry(adminEmail, "Reset vote for", name);
  }

  async function handleEditVoter(e: FormEvent) {
    e.preventDefault();
    if (!editingVoter) return;
    setEditError(null);

    if (!editFirstName.trim() || !editLastName.trim()) { setEditError("Name required"); return; }
    if (!editVoterId.trim()) { setEditError("Voter ID required"); return; }

    setEditSaving(true);
    try {
      const { error: err } = await supabase
        .from("students")
        .update({
          first_name: editFirstName.trim(),
          last_name: editLastName.trim(),
          gender: editGender,
          year_section: editYearSection.trim(),
          voter_id: editVoterId.trim().toLowerCase(),
          full_name: `${editFirstName.trim()} ${editLastName.trim()}`,
        })
        .eq("id", editingVoter.id);

      if (err) {
        if (err.message.includes("unique") || err.message.includes("duplicate")) {
          setEditError("Voter ID already exists.");
        } else {
          setEditError(err.message);
        }
        return;
      }

      setShowEdit(false);
      setEditingVoter(null);
      await load();
      addAuditEntry(adminEmail, "Edited voter", `${editFirstName.trim()} ${editLastName.trim()} (${editVoterId.trim()})`);
    } catch {
      setEditError("An error occurred.");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleAddVoter(e: FormEvent) {
    e.preventDefault();
    setAddError(null);

    if (!newFirstName.trim() || !newLastName.trim()) { setAddError("Name required"); return; }
    if (!newVoterId.trim()) { setAddError("Voter ID required"); return; }
    if (!newPassword || newPassword.length < 8) { setAddError("Password min 8 characters"); return; }

    setAdding(true);
    try {
      const { error: rpcError } = await supabase.rpc("register_student", {
        p_first_name: newFirstName.trim(),
        p_last_name: newLastName.trim(),
        p_gender: newGender,
        p_year_section: newYearSection.trim(),
        p_voter_id: newVoterId.trim().toLowerCase(),
        p_password: newPassword,
      });

      if (rpcError) {
        if (rpcError.message.includes("unique") || rpcError.message.includes("duplicate")) {
          setAddError("Voter ID already exists.");
        } else {
          setAddError(rpcError.message);
        }
        return;
      }

      setNewFirstName(""); setNewLastName(""); setNewGender("Male");
      setNewYearSection(""); setNewVoterId(""); setNewPassword("");
      setShowAdd(false);
      await load();
      addAuditEntry(adminEmail, "Added voter", `${newFirstName.trim()} ${newLastName.trim()} (${newVoterId.trim()})`);
    } catch {
      setAddError("An error occurred.");
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

      const startIndex = lines[0]?.toLowerCase().includes("first_name") || lines[0]?.toLowerCase().includes("voter_id") ? 1 : 0;
      const rows = lines.slice(startIndex);

      setImportTotal(rows.length);
      let success = 0, duplicates = 0, failed = 0;

      for (let i = 0; i < rows.length; i++) {
        const cols = rows[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 6 || !cols[0] || !cols[1] || !cols[5]) {
          failed++;
          setImportProgress(i + 1);
          continue;
        }

        const [firstName, lastName, gender, yearSection, voterId, password] = cols;

        if (password.length < 8) {
          failed++;
          setImportProgress(i + 1);
          continue;
        }

        try {
          const { error: rpcError } = await supabase.rpc("register_student", {
            p_first_name: firstName,
            p_last_name: lastName,
            p_gender: gender,
            p_year_section: yearSection,
            p_voter_id: voterId.toLowerCase(),
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
        <td style="padding:8px 16px;font-family:monospace">${s.voter_id ?? '—'}</td>
        <td style="padding:8px 16px">${s.full_name ?? `${s.first_name ?? ''} ${s.last_name ?? ''}`}</td>
        <td style="padding:8px 16px">${s.gender ?? '—'}</td>
        <td style="padding:8px 16px">${s.year_section ?? '—'}</td>
        <td style="padding:8px 16px">${s.has_voted ? 'Yes' : 'No'}</td>
        <td style="padding:8px 16px;font-family:monospace">${s.has_voted && s.confirmation_code ? s.confirmation_code : '—'}</td>
      </tr>`
    ).join('');

    const html = `<!DOCTYPE html>
<html><head><title>Voters Report</title>
<style>body{font-family:system-ui,sans-serif;padding:40px}table{width:100%;border-collapse:collapse}th{text-align:left;padding:8px 16px;border-bottom:2px solid #18181b;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#71717a}td{font-size:14px;color:#18181b}</style>
</head><body>
<h1 style="font-size:20px;margin-bottom:4px">Voters Report</h1>
<p style="color:#71717a;font-size:14px;margin-bottom:24px">Generated ${new Date().toLocaleString()} · ${exportData.length} voters · ${exportData.filter(s => s.has_voted).length} voted</p>
<table><thead><tr><th>Voter ID</th><th>Name</th><th>Gender</th><th>Year &amp; Section</th><th>Voted</th><th>Code</th></tr></thead><tbody>${rows}</tbody></table>
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
            placeholder="Search by voter ID, name, or code..."
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
            + Add Voter
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

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm dark:bg-black/60" onClick={() => setShowAdd(false)} />
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Add New Voter</h3>
              <button onClick={() => setShowAdd(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleAddVoter} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">First Name</label>
                  <input type="text" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} required placeholder="Juan" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Last Name</label>
                  <input type="text" value={newLastName} onChange={e => setNewLastName(e.target.value)} required placeholder="dela Cruz" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Gender</label>
                  <CustomSelect
                    value={newGender}
                    onChange={setNewGender}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" }
                    ]}
                    placeholder="Select gender"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Year &amp; Section</label>
                  <input type="text" value={newYearSection} onChange={e => setNewYearSection(e.target.value)} placeholder="e.g. 3-A" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voter ID</label>
                  <input type="text" value={newVoterId} onChange={e => setNewVoterId(e.target.value)} required placeholder="e.g. 2024-0001" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="Min. 8 characters" className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 pr-10 text-sm text-zinc-900 placeholder-zinc-400 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:ring-maroon-500/20" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer">
                      {showPassword ? (
                        <EyeOff className="h-[18px] w-[18px]" />
                      ) : (
                        <Eye className="h-[18px] w-[18px]" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              {addError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {addError}
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={adding} className="rounded-lg bg-maroon-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-maroon-800 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer">
                  {adding ? "Adding..." : "Add Voter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && editingVoter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm dark:bg-black/60" onClick={() => setShowEdit(false)} />
          <div className="relative w-full max-w-2xl rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-white/10 dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-white/10">
              <h3 className="text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Edit Voter</h3>
              <button onClick={() => setShowEdit(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditVoter} className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voter ID</label>
                  <input type="text" value={editVoterId} onChange={e => setEditVoterId(e.target.value)} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-mono text-zinc-900 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">First Name</label>
                  <input type="text" value={editFirstName} onChange={e => setEditFirstName(e.target.value)} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Last Name</label>
                  <input type="text" value={editLastName} onChange={e => setEditLastName(e.target.value)} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-maroon-500/20" />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Gender</label>
                  <CustomSelect
                    value={editGender}
                    onChange={setEditGender}
                    options={[
                      { value: "Male", label: "Male" },
                      { value: "Female", label: "Female" }
                    ]}
                    placeholder="Select gender"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Year &amp; Section</label>
                  <input type="text" value={editYearSection} onChange={e => setEditYearSection(e.target.value)} className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/10 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:ring-maroon-500/20" />
                </div>
                <div className="col-span-2">
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voting Status</label>
                  <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm text-zinc-900 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100">
                    {editingVoter.has_voted ? "Voted" : "Not Voted"}
                    {editingVoter.confirmation_code ? " — Code: " + editingVoter.confirmation_code : ""}
                  </p>
                </div>
              </div>
              {editError && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                  {editError}
                </div>
              )}
              <div className="mt-6 flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowEdit(false)} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
                <button type="submit" disabled={editSaving} className="rounded-lg bg-maroon-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-maroon-800 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer">
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import panel */}
      {showImport && (
        <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Import Students from CSV</h3>
          <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
            CSV format: first_name,last_name,gender,year_section,voter_id,password (passwords must be 8+ chars)
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
              <Users className="h-7 w-7 text-zinc-400" />
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
            <thead>
              <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50">
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voter ID</th>
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Gender</th>
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Year & Section</th>
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Voted</th>
                <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Code</th>
                <th className="px-6 pt-4 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <span className="font-mono text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {s.voter_id ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {s.full_name ?? `${s.first_name ?? ""} ${s.last_name ?? ""}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {s.gender ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {s.year_section ?? "—"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {s.has_voted ? (
                      <span className="rounded-full bg-maroon-100 px-2.5 py-0.5 text-xs font-semibold text-maroon-700 dark:bg-maroon-500/20 dark:text-maroon-400">
                        Yes
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {s.has_voted && s.confirmation_code ? (
                      <span className="font-mono text-xs font-medium text-zinc-700 dark:text-zinc-300">
                        {s.confirmation_code}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button type="button" onClick={() => openEditVoter(s)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-maroon-300 hover:bg-maroon-50 hover:text-maroon-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-maroon-700 dark:hover:bg-maroon-900/20 dark:hover:text-maroon-400 cursor-pointer transition-colors duration-200">
                        Edit
                      </button>
                      {s.has_voted && (
                        <button onClick={() => handleResetVote(s.id, s.full_name)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-amber-800 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 cursor-pointer transition-colors duration-200">
                          Reset
                        </button>
                      )}
                    </div>
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

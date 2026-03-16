import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Student } from "../../lib/types";

export function VotersPanel() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resetConfirm, setResetConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

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
    const q = search.toLowerCase().trim();
    if (!q) {
      setFiltered(students);
      return;
    }
    setFiltered(students.filter(s => 
      s.full_name.toLowerCase().includes(q) || 
      (s.email ?? "").toLowerCase().includes(q)
    ));
  }, [search, students]);

  async function handleResetVote(id: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_reset_voter", {
      p_admin_email: adminEmail,
      p_student_id: id,
    });
    if (err) setError(err.message);
    setResetConfirm(null);
    setSaving(false);
    await load();
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
    } catch {
      setAddError("Failed to add voter");
    } finally {
      setAdding(false);
    }
  }

  const votedCount = students.filter(s => s.has_voted).length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-900 py-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Voters</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{votedCount}/{students.length} voted</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-48 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 bg-maroon-700 text-white rounded-lg text-sm font-medium hover:bg-maroon-800"
          >
            {showAdd ? "Cancel" : "+ Add Voter"}
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
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
              className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              placeholder="Password"
              className="w-36 rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
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
          <p className="p-6 text-zinc-500 dark:text-zinc-400 text-center">
            {search ? "No results" : "No voters yet"}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-zinc-500 dark:text-zinc-400">Name</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Voted</th>
                <th className="text-right px-4 py-3 font-medium text-zinc-500 dark:text-zinc-400">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className="border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800">
                  <td className="px-6 py-3 font-medium text-zinc-900 dark:text-zinc-100">{s.full_name}</td>
                  <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{s.email ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.has_voted ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      {s.has_voted ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.has_voted && (
                      resetConfirm === s.id ? (
                        <span className="flex justify-end gap-2">
                          <button onClick={() => handleResetVote(s.id)} disabled={saving} className="text-red-600">Confirm</button>
                          <button onClick={() => setResetConfirm(null)} className="text-zinc-400 dark:text-zinc-500">Cancel</button>
                        </span>
                      ) : (
                        <button onClick={() => setResetConfirm(s.id)} className="text-zinc-400 dark:text-zinc-500 hover:text-amber-600">
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

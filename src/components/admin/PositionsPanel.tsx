import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election, Position } from "../../lib/types";
import { addAuditEntry } from "../../utils/auditLog";
import { CustomSelect } from "../CustomSelect";
import { List } from "lucide-react";

type FormData = { title: string; max_votes: string; display_order: string };
const EMPTY_FORM: FormData = { title: "", max_votes: "1", display_order: "1" };

/**
 * Positions panel — election selector + full CRUD for positions.
 * White theme (2026)
 */
export function PositionsPanel() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";

  // Load elections
  useEffect(() => {
    supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: err }: { data: Election[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else {
          setElections(data ?? []);
          if (data && data.length > 0) {
            const active = data.find((e) => e.is_active);
            setSelectedElectionId(active?.id ?? data[0].id);
          }
        }
        setLoadingElections(false);
      });
  }, []);

  // Load positions when election changes
  useEffect(() => {
    if (!selectedElectionId) return;
    setLoadingPositions(true);
    supabase
      .from("positions")
      .select("*")
      .eq("election_id", selectedElectionId)
      .order("display_order", { ascending: true })
      .then(({ data, error: err }: { data: Position[] | null; error: { message: string } | null }) => {
        if (err) setError(err.message);
        else setPositions(data ?? []);
        setLoadingPositions(false);
      });
  }, [selectedElectionId]);

  async function reload() {
    if (!selectedElectionId) return;
    setLoadingPositions(true);
    const { data } = await supabase
      .from("positions")
      .select("*")
      .eq("election_id", selectedElectionId)
      .order("display_order", { ascending: true });
    setPositions(data ?? []);
    setLoadingPositions(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      display_order: String((positions.length > 0 ? Math.max(...positions.map((p) => p.display_order)) : 0) + 1),
    });
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(p: Position) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      max_votes: String(p.max_votes),
      display_order: String(p.display_order),
    });
    setFormError(null);
    setShowForm(true);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(false);
    setFormError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.title.trim()) { setFormError("Title is required."); return; }
    const maxVotes = parseInt(form.max_votes, 10);
    const displayOrder = parseInt(form.display_order, 10);
    if (isNaN(maxVotes) || maxVotes < 1) { setFormError("Max votes must be >= 1."); return; }
    if (isNaN(displayOrder) || displayOrder < 1) { setFormError("Display order must be >= 1."); return; }

    setSaving(true);
    try {
      const { error: err } = await supabase.rpc("admin_upsert_position", {
        p_admin_email: adminEmail,
        p_id: editingId ?? null,
        p_election_id: selectedElectionId,
        p_title: form.title.trim(),
        p_max_votes: maxVotes,
        p_display_order: displayOrder,
      });
      if (err) throw new Error(err.message);
      cancelForm();
      await reload();
      addAuditEntry(adminEmail, editingId ? "Updated position" : "Created position", form.title.trim());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_delete_position", {
      p_admin_email: adminEmail,
      p_id: id,
    });
    if (err) setError(err.message);
    setDeleteConfirm(null);
    setSaving(false);
    await reload();
    addAuditEntry(adminEmail, "Deleted position", title);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md px-5 py-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Positions</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Define ballot positions and voting limits
            </p>
          </div>
          {!loadingElections && (
            <div className="w-64 relative z-40">
              <CustomSelect
                value={selectedElectionId}
                onChange={setSelectedElectionId}
                options={elections.map((el) => ({ value: el.id, label: el.name }))}
                placeholder="Select Election"
              />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={!selectedElectionId}
          className="rounded-lg bg-maroon-700 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-40 cursor-pointer"
        >
          + Add Position
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loadingPositions && (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 w-10 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-5 w-8 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          )}
          {!loadingPositions && positions.length === 0 && selectedElectionId && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                <List className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No positions yet
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Create your first position to get started.
              </p>
            </div>
          )}
          {positions.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 dark:backdrop-blur-md shadow-sm">
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Order</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Title</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Max Votes</th>
                  <th className="px-6 pt-4 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p) => (
                  <tr key={p.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer">
                    <td className="px-6 py-4 tabular-nums text-zinc-500 dark:text-zinc-400">{p.display_order}</td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{p.title}</td>
                    <td className="px-6 py-4 tabular-nums">
                      <span className="inline-flex items-center rounded-full bg-maroon-100 px-2.5 py-0.5 text-xs font-medium text-maroon-700 dark:bg-maroon-500/20 dark:text-maroon-400">
                        {p.max_votes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button type="button" onClick={() => startEdit(p)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-maroon-300 hover:bg-maroon-50 hover:text-maroon-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-maroon-700 dark:hover:bg-maroon-900/20 dark:hover:text-maroon-400 cursor-pointer transition-colors duration-200">Edit</button>
                        {deleteConfirm === p.id ? (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => handleDelete(p.id, p.title)} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer">Confirm</button>
                            <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setDeleteConfirm(p.id)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400 cursor-pointer transition-colors duration-200">Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Form sidebar */}
        {showForm && (
          <div className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? "Edit Position" : "New Position"}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Title</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30" placeholder="e.g. President" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Max Votes</label>
                <input type="number" min={1} value={form.max_votes} onChange={(e) => setForm({ ...form, max_votes: e.target.value })} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30" placeholder="e.g. 1" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Display Order</label>
                <input type="number" min={1} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} required className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30" placeholder="e.g. 1" />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button type="submit" disabled={saving} className="rounded-lg bg-maroon-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-maroon-800 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer">
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" onClick={cancelForm} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

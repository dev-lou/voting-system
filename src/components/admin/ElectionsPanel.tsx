import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election } from "../../lib/types";
import { addAuditEntry } from "../../utils/auditLog";
import { CustomDateTimePicker } from "../CustomDateTimePicker";
import { Calendar } from "lucide-react";

type FormData = {
  name: string;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
};

const EMPTY_FORM: FormData = {
  name: "",
  starts_at: "",
  ends_at: "",
  is_active: false,
};

/**
 * Elections panel — full CRUD for elections.
 * White theme (2026)
 */
export function ElectionsPanel() {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [toggleConfirm, setToggleConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";

  async function load() {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    else setElections(data ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(e: Election) {
    setEditingId(e.id);
    setForm({
      name: e.name,
      starts_at: e.starts_at ? e.starts_at.slice(0, 16) : "",
      ends_at: e.ends_at ? e.ends_at.slice(0, 16) : "",
      is_active: e.is_active,
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
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (form.starts_at && form.ends_at && new Date(form.ends_at) <= new Date(form.starts_at)) {
      setFormError("End date must be after start date.");
      return;
    }
    setSaving(true);

    try {
      const { error: err } = await supabase.rpc("admin_upsert_election", {
        p_admin_email: adminEmail,
        p_id: editingId ?? null,
        p_name: form.name.trim(),
        p_starts_at: form.starts_at || null,
        p_ends_at: form.ends_at || null,
        p_is_active: form.is_active,
      });
      if (err) throw new Error(err.message);

      cancelForm();
      await load();
      addAuditEntry(adminEmail, editingId ? "Updated election" : "Created election", form.name.trim());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_delete_election", {
      p_admin_email: adminEmail,
      p_id: id,
    });
    if (err) setError(err.message);
    setDeleteConfirm(null);
    setSaving(false);
    await load();
    addAuditEntry(adminEmail, "Deleted election", name);
  }

  async function handleToggleActive(election: Election) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_toggle_election", {
      p_admin_email: adminEmail,
      p_id: election.id,
    });
    if (err) setError(err.message);
    setSaving(false);
    await load();
    addAuditEntry(adminEmail, election.is_active ? "Deactivated election" : "Activated election", election.name);
  }

  const isCreating = editingId === null && showForm;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md px-5 py-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Elections</h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Create and manage election periods
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-lg bg-maroon-700 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-800 cursor-pointer"
        >
          + New Election
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-24 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-6 w-16 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          )}
          {error && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && elections.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                <Calendar className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No elections yet
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Create your first election to get started.
              </p>
            </div>
          )}
          {elections.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 dark:backdrop-blur-md shadow-sm">
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Starts</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Ends</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-6 pt-4 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map((el) => (
                  <tr
                    key={el.id}
                    className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer"
                  >
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{el.name}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {el.starts_at ? new Date(el.starts_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">
                      {el.ends_at ? new Date(el.ends_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {toggleConfirm === el.id ? (
                        <span className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => { setToggleConfirm(null); handleToggleActive(el); }}
                            disabled={saving}
                            className={`rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                              el.is_active
                                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-400"
                                : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-400"
                            }`}
                          >
                            {el.is_active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setToggleConfirm(null)}
                            className="rounded-lg px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setToggleConfirm(el.id)}
                          disabled={saving}
                          className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors duration-200 ${
                            el.is_active
                              ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 border border-green-200 dark:border-green-500/20 cursor-pointer"
                              : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 cursor-pointer"
                          }`}
                        >
                          {el.is_active ? "Active" : "Inactive"}
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(el)}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-maroon-300 hover:bg-maroon-50 hover:text-maroon-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-maroon-700 dark:hover:bg-maroon-900/20 dark:hover:text-maroon-400 cursor-pointer transition-colors duration-200"
                        >
                          Edit
                        </button>
                        {deleteConfirm === el.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(el.id, el.name)}
                              disabled={saving}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(el.id)}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400 cursor-pointer transition-colors duration-200"
                          >
                            Delete
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

        {/* Form sidebar */}
        {(editingId !== null || isCreating) && (
          <div className="w-96 shrink-0 overflow-y-auto border-l border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md p-5 pb-24">
            <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? "Edit Election" : "New Election"}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Name">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30"
                  placeholder="e.g. SY 2025-2026 Election"
                />
              </Field>
              <Field label="Starts At">
                <CustomDateTimePicker
                  value={form.starts_at}
                  onChange={(val) => setForm({ ...form, starts_at: val })}
                  placeholder="Select start date and time"
                />
              </Field>
              <Field label="Ends At">
                <CustomDateTimePicker
                  value={form.ends_at}
                  onChange={(val) => setForm({ ...form, ends_at: val })}
                  placeholder="Select end date and time"
                />
              </Field>
              <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-zinc-300 dark:border-white/10 text-maroon-700 focus:ring-maroon-500"
                />
                Set as active
              </label>
              {formError && (
                <p className="text-sm text-red-600">{formError}</p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-maroon-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-maroon-800 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </label>
      {children}
    </div>
  );
}

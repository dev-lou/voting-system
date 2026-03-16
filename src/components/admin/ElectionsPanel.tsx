import { useState, useEffect, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election } from "../../lib/types";

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
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_delete_election", {
      p_admin_email: adminEmail,
      p_id: id,
    });
    if (err) setError(err.message);
    setDeleteConfirm(null);
    setSaving(false);
    await load();
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
  }

  const isCreating = editingId === null && showForm;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Elections</h2>
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
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
          )}
          {error && (
            <div className="m-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {!loading && elections.length === 0 && (
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
              No elections yet. Create one to get started.
            </p>
          )}
          {elections.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Starts</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Ends</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {elections.map((el) => (
                  <tr
                    key={el.id}
                    className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900"
                  >
                    <td className="px-5 py-3 font-medium text-zinc-900 dark:text-zinc-100">{el.name}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {el.starts_at ? new Date(el.starts_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">
                      {el.ends_at ? new Date(el.ends_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(el)}
                        disabled={saving}
                        className={`rounded-full px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                          el.is_active
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                        }`}
                      >
                        {el.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(el)}
                          className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-maroon-600 cursor-pointer"
                        >
                          Edit
                        </button>
                        {deleteConfirm === el.id ? (
                          <span className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDelete(el.id)}
                              disabled={saving}
                              className="text-sm text-red-600 hover:text-red-700 cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirm(null)}
                              className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirm(el.id)}
                            className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-red-600 cursor-pointer"
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
          <div className="w-72 shrink-0 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-maroon-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                  placeholder="e.g. SY 2025-2026 Election"
                />
              </Field>
              <Field label="Starts At">
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-maroon-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </Field>
              <Field label="Ends At">
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition-colors duration-150 focus:border-maroon-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                />
              </Field>
              <label className="flex items-center gap-2.5 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-maroon-700 focus:ring-maroon-500"
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
                  className="flex-1 rounded-lg bg-maroon-700 py-2.5 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={cancelForm}
                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:bg-zinc-900 cursor-pointer"
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

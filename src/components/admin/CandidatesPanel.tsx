import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election, Position, Candidate } from "../../lib/types";

type FormData = { full_name: string; party: string; photo_url: string };
const EMPTY_FORM: FormData = { full_name: "", party: "", photo_url: "" };

/**
 * Candidates panel — election + position selectors + full CRUD for candidates.
 * Includes photo upload to Supabase Storage.
 */
export function CandidatesPanel() {
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPositionId, setSelectedPositionId] = useState<string>("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingElections, setLoadingElections] = useState(true);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminEmail = sessionStorage.getItem(ADMIN_SESSION_KEY) ?? "";

  // Load elections
  useEffect(() => {
    supabase
      .from("elections")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }: { data: Election[] | null }) => {
        setElections(data ?? []);
        if (data && data.length > 0) {
          const active = data.find((e) => e.is_active);
          setSelectedElectionId(active?.id ?? data[0].id);
        }
        setLoadingElections(false);
      });
  }, []);

  // Load positions when election changes
  useEffect(() => {
    if (!selectedElectionId) return;
    setSelectedPositionId("");
    setCandidates([]);
    setLoadingPositions(true);
    supabase
      .from("positions")
      .select("*")
      .eq("election_id", selectedElectionId)
      .order("display_order", { ascending: true })
      .then(({ data }: { data: Position[] | null }) => {
        setPositions(data ?? []);
        if (data && data.length > 0) setSelectedPositionId(data[0].id);
        setLoadingPositions(false);
      });
  }, [selectedElectionId]);

  // Load candidates when position changes
  useEffect(() => {
    if (!selectedPositionId) return;
    setLoadingCandidates(true);
    supabase
      .from("candidates")
      .select("*")
      .eq("position_id", selectedPositionId)
      .order("full_name", { ascending: true })
      .then(({ data }: { data: Candidate[] | null }) => {
        setCandidates(data ?? []);
        setLoadingCandidates(false);
      });
  }, [selectedPositionId]);

  async function reload() {
    if (!selectedPositionId) return;
    setLoadingCandidates(true);
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .eq("position_id", selectedPositionId)
      .order("full_name", { ascending: true });
    setCandidates(data ?? []);
    setLoadingCandidates(false);
  }

  function startCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function startEdit(c: Candidate) {
    setEditingId(c.id);
    setForm({ 
      full_name: c.full_name, 
      party: c.party ?? "", 
      photo_url: c.photo_url ?? "" 
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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      setFormError("Photo must be less than 5MB");
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setFormError("Photo must be JPG, PNG, or WebP");
      return;
    }

    setUploadingPhoto(true);
    setFormError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${selectedPositionId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("candidate-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data: urlData } = supabase.storage
        .from("candidate-photos")
        .getPublicUrl(filePath);

      setForm({ ...form, photo_url: urlData.publicUrl });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.full_name.trim()) { setFormError("Full name is required."); return; }
    setSaving(true);
    try {
      const { error: err } = await supabase.rpc("admin_upsert_candidate", {
        p_admin_email: adminEmail,
        p_id: editingId ?? null,
        p_position_id: selectedPositionId,
        p_full_name: form.full_name.trim(),
        p_party: form.party.trim() || null,
        p_photo_url: form.photo_url || null,
      });
      if (err) throw new Error(err.message);
      cancelForm();
      await reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_delete_candidate", {
      p_admin_email: adminEmail,
      p_id: id,
    });
    if (err) setError(err.message);
    setDeleteConfirm(null);
    setSaving(false);
    await reload();
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Candidates</h2>
          {!loadingElections && (
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-maroon-500 cursor-pointer"
            >
              {elections.map((el) => (
                <option key={el.id} value={el.id}>{el.name}</option>
              ))}
            </select>
          )}
          {!loadingPositions && positions.length > 0 && (
            <select
              value={selectedPositionId}
              onChange={(e) => setSelectedPositionId(e.target.value)}
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 outline-none focus:border-maroon-500 cursor-pointer"
            >
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          )}
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={!selectedPositionId}
          className="rounded-lg bg-maroon-700 px-4 py-2 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-40 cursor-pointer"
        >
          + Add Candidate
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {(loadingCandidates || loadingPositions) && (
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">Loading...</p>
          )}
          {!loadingCandidates && !loadingPositions && candidates.length === 0 && selectedPositionId && (
            <p className="p-5 text-sm text-zinc-500 dark:text-zinc-400">No candidates for this position.</p>
          )}
          {candidates.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Photo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Party</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id} className="border-b border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:bg-zinc-900">
                    <td className="px-5 py-3">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-400 dark:text-zinc-500">
                            {c.full_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">{c.full_name}</td>
                    <td className="px-4 py-3 text-zinc-500 dark:text-zinc-400">{c.party ?? "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button type="button" onClick={() => startEdit(c)} className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-maroon-600 cursor-pointer">Edit</button>
                        {deleteConfirm === c.id ? (
                          <span className="flex items-center gap-2">
                            <button type="button" onClick={() => handleDelete(c.id)} disabled={saving} className="text-sm text-red-600 hover:text-red-700 cursor-pointer">Confirm</button>
                            <button type="button" onClick={() => setDeleteConfirm(null)} className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:text-zinc-400 cursor-pointer">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setDeleteConfirm(c.id)} className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-red-600 cursor-pointer">Delete</button>
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
          <div className="w-80 shrink-0 overflow-y-auto border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
            <p className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {editingId ? "Edit Candidate" : "New Candidate"}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo upload */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Candidate Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
                        </svg>
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 disabled:opacity-50 cursor-pointer"
                    >
                      {form.photo_url ? "Change Photo" : "Upload Photo"}
                    </button>
                    <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">JPG, PNG, WebP — max 5MB</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</label>
                <input 
                  type="text" 
                  value={form.full_name} 
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })} 
                  required 
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-maroon-500" 
                  placeholder="Juan dela Cruz" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Party (optional)</label>
                <input 
                  type="text" 
                  value={form.party} 
                  onChange={(e) => setForm({ ...form, party: e.target.value })} 
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:border-maroon-500" 
                  placeholder="e.g. Unity Party" 
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={saving || uploadingPhoto} 
                  className="flex-1 rounded-lg bg-maroon-700 py-2.5 text-sm font-semibold text-white hover:bg-maroon-800 disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Candidate"}
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

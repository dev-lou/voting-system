import { useState, useEffect, useRef, type FormEvent } from "react";
import { supabase } from "../../lib/supabase";
import { ADMIN_SESSION_KEY } from "../../App";
import type { Election, Position, Candidate } from "../../lib/types";
import { addAuditEntry } from "../../utils/auditLog";
import { CustomSelect } from "../CustomSelect";
import { Users, Camera, Loader2 } from "lucide-react";

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
      addAuditEntry(adminEmail, editingId ? "Updated candidate" : "Added candidate", form.full_name.trim());
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    setSaving(true);
    const { error: err } = await supabase.rpc("admin_delete_candidate", {
      p_admin_email: adminEmail,
      p_id: id,
    });
    if (err) setError(err.message);
    setDeleteConfirm(null);
    setSaving(false);
    await reload();
    addAuditEntry(adminEmail, "Removed candidate", name);
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/50 dark:backdrop-blur-md px-5 py-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Candidates</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage candidate profiles and affiliations
            </p>
          </div>
          {!loadingElections && (
            <div className="w-56 relative z-40">
              <CustomSelect
                value={selectedElectionId}
                onChange={setSelectedElectionId}
                options={elections.map((el) => ({ value: el.id, label: el.name }))}
                placeholder="Select Election"
              />
            </div>
          )}
          {!loadingPositions && positions.length > 0 && (
            <div className="w-48 relative z-40">
              <CustomSelect
                value={selectedPositionId}
                onChange={setSelectedPositionId}
                options={positions.map((p) => ({ value: p.id, label: p.title }))}
                placeholder="Select Position"
              />
            </div>
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
            <div className="p-5 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-32 rounded bg-zinc-200 dark:bg-zinc-700" />
                  <div className="h-4 w-20 rounded bg-zinc-200 dark:bg-zinc-700" />
                </div>
              ))}
            </div>
          )}
          {!loadingCandidates && !loadingPositions && candidates.length === 0 && selectedPositionId && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-white/10 dark:bg-zinc-800">
                <Users className="h-7 w-7 text-zinc-400" />
              </div>
              <p className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                No candidates yet
              </p>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Create your first candidate to get started.
              </p>
            </div>
          )}
          {candidates.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 dark:backdrop-blur-md shadow-sm">
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Photo</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Name</th>
                  <th className="px-6 pt-4 pb-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Party</th>
                  <th className="px-6 pt-4 pb-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                   <tr key={c.id} className="border-b border-zinc-100 dark:border-white/5 hover:bg-zinc-50 dark:hover:bg-white/5 transition-colors duration-200 cursor-pointer">
                    <td className="px-6 py-4">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                        {c.photo_url ? (
                          <img src={c.photo_url} alt={c.full_name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500 dark:text-zinc-400">
                            {c.full_name.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{c.full_name}</td>
                    <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400">{c.party ?? "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center gap-1.5 justify-end">
                        <button type="button" onClick={() => startEdit(c)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-maroon-300 hover:bg-maroon-50 hover:text-maroon-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-maroon-700 dark:hover:bg-maroon-900/20 dark:hover:text-maroon-400 cursor-pointer transition-colors duration-200">Edit</button>
                        {deleteConfirm === c.id ? (
                          <span className="flex items-center gap-1.5">
                            <button type="button" onClick={() => handleDelete(c.id, c.full_name)} disabled={saving} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer">Confirm</button>
                            <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:bg-zinc-50 dark:border-white/10 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer">Cancel</button>
                          </span>
                        ) : (
                          <button type="button" onClick={() => setDeleteConfirm(c.id)} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-red-300 hover:bg-red-50 hover:text-red-700 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-red-800 dark:hover:bg-red-900/20 dark:hover:text-red-400 cursor-pointer transition-colors duration-200">Delete</button>
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
              {editingId ? "Edit Candidate" : "New Candidate"}
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo upload */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Candidate Photo
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-2 border-dashed border-zinc-300 dark:border-white/10 bg-zinc-50 dark:bg-zinc-900">
                    {form.photo_url ? (
                      <img src={form.photo_url} alt="Preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                        <Camera className="h-6 w-6" />
                      </div>
                    )}
                    {uploadingPhoto && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
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
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                        className="rounded-lg border border-zinc-300 dark:border-white/10 bg-white dark:bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 cursor-pointer"
                      >
                        {form.photo_url ? "Change Photo" : "Upload Photo"}
                      </button>
                      {form.photo_url && (
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, photo_url: "" })}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-300 cursor-pointer dark:border-white/10 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Remove
                        </button>
                      )}
                    </div>
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
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30" 
                  placeholder="Juan dela Cruz" 
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Party (optional)</label>
                <input 
                  type="text" 
                  value={form.party} 
                  onChange={(e) => setForm({ ...form, party: e.target.value })} 
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-900 placeholder-zinc-400 outline-none transition-colors focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/20 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-maroon-500 dark:focus:ring-maroon-500/30" 
                  placeholder="e.g. Unity Party" 
                />
              </div>
              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button 
                  type="submit" 
                  disabled={saving || uploadingPhoto} 
                  className="rounded-lg bg-maroon-700 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-maroon-800 hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
                >
                  {saving ? "Saving..." : "Save Candidate"}
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

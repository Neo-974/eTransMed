"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function PatientEdit({
  patientId,
  nom,
  prenom,
  dateNaissance,
}: {
  patientId: string;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [n, setN] = useState(nom);
  const [p, setP] = useState(prenom);
  const [dob, setDob] = useState(dateNaissance ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase
      .from("patients")
      .update({ nom: n, prenom: p, date_naissance: dob || null })
      .eq("id", patientId);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function remove() {
    if (
      !confirm(
        `Supprimer définitivement ${nom.toUpperCase()} ${prenom} et TOUTES ses transmissions ? Cette action est irréversible.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.from("patients").delete().eq("id", patientId);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/patients");
    router.refresh();
  }

  if (!open) {
    return (
      <div className="flex gap-2">
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          ✏️ Modifier
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          🗑️ Supprimer
        </button>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-lg border bg-slate-50 p-3">
      <div className="flex gap-2">
        <input
          required
          placeholder="Nom"
          value={n}
          onChange={(e) => setN(e.target.value)}
          className="w-1/2 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
        <input
          required
          placeholder="Prénom"
          value={p}
          onChange={(e) => setP(e.target.value)}
          className="w-1/2 rounded border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <label className="block text-xs text-slate-500">Date de naissance</label>
      <input
        type="date"
        value={dob}
        onChange={(e) => setDob(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={busy}
          className="flex-1 rounded bg-brand py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}

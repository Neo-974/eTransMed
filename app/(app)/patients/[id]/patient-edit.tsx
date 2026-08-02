"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "idle" | "edit" | "confirm";

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
  const [mode, setMode] = useState<Mode>("idle");
  const [n, setN] = useState(nom);
  const [p, setP] = useState(prenom);
  const [dob, setDob] = useState(dateNaissance ?? "");
  const [confirmText, setConfirmText] = useState("");
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
    setMode("idle");
    router.refresh();
  }

  async function remove() {
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

  if (mode === "idle") {
    return (
      <div className="space-y-1">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("edit")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ✏️ Modifier
          </button>
          <button
            onClick={() => {
              setConfirmText("");
              setError(null);
              setMode("confirm");
            }}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            🗑️ Supprimer
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (mode === "confirm") {
    const ready = confirmText.trim().toUpperCase() === "SUPPRIMER";
    return (
      <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-3">
        <p className="text-sm font-semibold text-red-700">Supprimer ce patient ?</p>
        <p className="text-xs text-red-700">
          Cette action est <b>irréversible</b> : elle efface {nom.toUpperCase()} {prenom} et{" "}
          <b>toutes ses transmissions</b>. Pour confirmer, tapez{" "}
          <b>SUPPRIMER</b> ci-dessous.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Tapez SUPPRIMER"
          className="w-full rounded border border-red-300 px-2 py-1.5 text-sm"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={remove}
            disabled={!ready || busy}
            className="flex-1 rounded bg-red-600 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy ? "…" : "Confirmer la suppression"}
          </button>
          <button onClick={() => setMode("idle")} className="rounded border px-3 py-1.5 text-sm">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // mode === "edit"
  return (
    <form onSubmit={save} className="space-y-2 rounded-lg border bg-slate-50 p-3">
      <div className="flex gap-2">
        <input required placeholder="Nom" value={n} onChange={(e) => setN(e.target.value)}
          className="w-1/2 rounded border border-slate-300 px-2 py-1.5 text-sm" />
        <input required placeholder="Prénom" value={p} onChange={(e) => setP(e.target.value)}
          className="w-1/2 rounded border border-slate-300 px-2 py-1.5 text-sm" />
      </div>
      <label className="block text-xs text-slate-500">Date de naissance</label>
      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy}
          className="flex-1 rounded bg-brand py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setMode("idle")} className="rounded border px-3 py-1.5 text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}

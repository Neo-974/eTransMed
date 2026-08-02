"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const ROLES = [
  { key: "collaborateur", label: "Collaborateur" },
  { key: "remplacant", label: "Remplaçant" },
  { key: "admin", label: "Admin" },
  { key: "titulaire", label: "Titulaire" },
];

export default function CreatePractitioner() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nom, setNom] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("collaborateur");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOk(false);
    const res = await fetch("/api/admin/create-practitioner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nom, password, role }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(j.error ?? "Erreur.");
      return;
    }
    setEmail("");
    setNom("");
    setPassword("");
    setOk(true);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-dashed border-brand py-2 text-sm font-medium text-brand"
        >
          + Créer un praticien (avec mot de passe)
        </button>
        {ok && <p className="text-xs text-emerald-600">Praticien créé ✓</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg border bg-slate-50 p-3">
      <input required placeholder="Nom du praticien" value={nom}
        onChange={(e) => setNom(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <input required type="email" placeholder="Email" value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <input required type="text" placeholder="Mot de passe (≥ 6)" value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
      <select value={role} onChange={(e) => setRole(e.target.value)}
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm">
        {ROLES.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={busy}
          className="flex-1 rounded bg-brand py-1.5 text-sm font-medium text-white disabled:opacity-50">
          {busy ? "…" : "Créer le praticien"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="rounded border px-3 py-1.5 text-sm">
          Annuler
        </button>
      </div>
    </form>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = { id: string; nom_complet: string | null; role: string; actif: boolean };

const ROLES = [
  { key: "titulaire", label: "Titulaire" },
  { key: "admin", label: "Admin" },
  { key: "collaborateur", label: "Collaborateur" },
  { key: "remplacant", label: "Remplaçant" },
];
const roleLabel = (k: string) => ROLES.find((r) => r.key === k)?.label ?? k;

export default function MembersManager({
  members,
  currentUserId,
  isManager,
}: {
  members: Member[];
  currentUserId: string;
  isManager: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [names, setNames] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, m.nom_complet ?? ""]))
  );

  // Intègre les nouveaux membres (ex. après création) sans écraser une saisie en cours.
  useEffect(() => {
    setNames((prev) => {
      const next = { ...prev };
      for (const m of members) {
        if (!(m.id in next)) next[m.id] = m.nom_complet ?? "";
      }
      return next;
    });
  }, [members]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwFor, setPwFor] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [delFor, setDelFor] = useState<string | null>(null);
  const [delText, setDelText] = useState("");

  async function saveName(id: string) {
    setBusy(id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ nom_complet: names[id] }).eq("id", id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function changeRole(id: string, role: string) {
    setBusy(id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function setActive(id: string, actif: boolean) {
    setBusy(id);
    setError(null);
    const { error } = await supabase.from("profiles").update({ actif }).eq("id", id);
    setBusy(null);
    if (error) setError(error.message);
    else router.refresh();
  }

  async function savePassword(id: string) {
    setBusy(id);
    setPwMsg(null);
    const res = await fetch("/api/admin/set-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: id, password: pwValue }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setPwMsg(j.error ?? "Erreur.");
      return;
    }
    setPwFor(null);
    setPwValue("");
    setPwMsg("Mot de passe mis à jour ✓");
  }

  async function deletePractitioner(id: string) {
    setBusy(id);
    setError(null);
    const res = await fetch("/api/admin/delete-practitioner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: id }),
    });
    const j = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(j.error ?? "Suppression impossible.");
      return;
    }
    setDelFor(null);
    setDelText("");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {pwMsg && <p className="text-sm text-emerald-600">{pwMsg}</p>}
      <ul className="divide-y rounded-lg border">
        {members.map((m) => {
          const isSelf = m.id === currentUserId;
          const canManageOther = isManager && !isSelf;
          const canRename = isSelf || isManager;
          return (
            <li
              key={m.id}
              className={`space-y-2 px-4 py-3 text-sm ${m.actif ? "" : "bg-slate-50 opacity-70"}`}
            >
              <div className="flex items-center gap-2">
                {canRename ? (
                  <>
                    <input
                      value={names[m.id] ?? ""}
                      onChange={(e) => setNames({ ...names, [m.id]: e.target.value })}
                      className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
                    />
                    <button
                      onClick={() => saveName(m.id)}
                      disabled={busy === m.id}
                      className="rounded bg-brand px-2 py-1 text-xs font-medium text-white disabled:opacity-50"
                    >
                      ✓
                    </button>
                  </>
                ) : (
                  <span className="flex-1 font-medium">{m.nom_complet ?? "—"}</span>
                )}
                {isSelf && <span className="text-[11px] text-slate-400">(vous)</span>}
                {!m.actif && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
                    Retiré
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {canManageOther ? (
                  <select
                    value={m.role}
                    disabled={busy === m.id}
                    onChange={(e) => changeRole(m.id, e.target.value)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">
                    {roleLabel(m.role)}
                  </span>
                )}

                {isManager && (
                  <button
                    onClick={() => {
                      setPwFor(pwFor === m.id ? null : m.id);
                      setPwValue("");
                      setPwMsg(null);
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    🔑 Mot de passe
                  </button>
                )}

                {canManageOther && (
                  <div className="ml-auto flex gap-2">
                    <button
                      onClick={() => setActive(m.id, !m.actif)}
                      disabled={busy === m.id}
                      className={
                        m.actif
                          ? "rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                          : "rounded border border-brand px-2 py-1 text-xs font-medium text-brand hover:bg-teal-50 disabled:opacity-50"
                      }
                    >
                      {m.actif ? "Retirer" : "Ajouter"}
                    </button>
                    <button
                      onClick={() => {
                        setDelFor(delFor === m.id ? null : m.id);
                        setDelText("");
                        setError(null);
                      }}
                      disabled={busy === m.id}
                      className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>

              {pwFor === m.id && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pwValue}
                    onChange={(e) => setPwValue(e.target.value)}
                    placeholder="Nouveau mot de passe (≥ 6)"
                    className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                  <button
                    onClick={() => savePassword(m.id)}
                    disabled={busy === m.id || pwValue.length < 6}
                    className="rounded bg-brand px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Définir
                  </button>
                </div>
              )}

              {delFor === m.id && (
                <div className="space-y-2 rounded-lg border border-red-300 bg-red-50 p-2">
                  <p className="text-xs text-red-700">
                    Supprimer <b>définitivement</b> le compte de{" "}
                    <b>{m.nom_complet || "ce praticien"}</b> ? Tapez <b>SUPPRIMER</b> pour confirmer.
                  </p>
                  <div className="flex gap-2">
                    <input
                      value={delText}
                      onChange={(e) => setDelText(e.target.value)}
                      placeholder="Tapez SUPPRIMER"
                      className="min-w-0 flex-1 rounded border border-red-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => deletePractitioner(m.id)}
                      disabled={busy === m.id || delText.trim().toUpperCase() !== "SUPPRIMER"}
                      className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                    >
                      Confirmer
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {!isManager && (
        <p className="text-xs text-slate-400">
          Seuls le titulaire et les admins peuvent gérer les praticiens.
        </p>
      )}
    </div>
  );
}

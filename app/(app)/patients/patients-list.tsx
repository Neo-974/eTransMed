"use client";

import { useState } from "react";
import Link from "next/link";

type Patient = { id: string; nom: string; prenom: string; date_naissance: string | null };

// Normalise pour une recherche insensible à la casse et aux accents.
const DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(DIACRITICS, "");

export default function PatientsList({ patients }: { patients: Patient[] }) {
  const [q, setQ] = useState("");
  const query = norm(q.trim());
  const filtered = query
    ? patients.filter((p) => {
        const hay = norm(`${p.nom} ${p.prenom} ${p.prenom} ${p.nom}`);
        return hay.includes(query);
      })
    : patients;

  return (
    <div className="space-y-3">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          🔍
        </span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher un patient (nom ou prénom)…"
          className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-8 text-sm"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Effacer"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-1 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      {query && (
        <p className="text-xs text-slate-400">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} sur {patients.length}
        </p>
      )}

      <ul className="divide-y rounded-lg border">
        {filtered.map((p) => (
          <li key={p.id}>
            <Link
              href={`/patients/${p.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span>
                <span className="font-medium">{p.nom.toUpperCase()}</span> {p.prenom}
              </span>
              <span className="text-xs text-slate-400">{p.date_naissance ?? "—"}</span>
            </Link>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="px-4 py-6 text-center text-sm text-slate-400">
            {patients.length === 0
              ? "Aucun patient. Ajoutez-en un ci-dessus."
              : "Aucun patient ne correspond à la recherche."}
          </li>
        )}
      </ul>
    </div>
  );
}

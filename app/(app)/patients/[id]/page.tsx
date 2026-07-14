import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GenerateTransmission from "./generate-transmission";

export const dynamic = "force-dynamic";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default async function PatientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: patient } = await supabase
    .from("patients")
    .select("id, nom, prenom, date_naissance")
    .eq("id", params.id)
    .single();
  if (!patient) notFound();

  const startOfDay = `${todayISO()}T00:00:00`;
  const { data: passages } = await supabase
    .from("passages")
    .select("id, recorded_at, transcript_corrige, transcript_raw, statut")
    .eq("patient_id", params.id)
    .gte("recorded_at", startOfDay)
    .order("recorded_at", { ascending: true });

  const { data: transmission } = await supabase
    .from("transmissions")
    .select("id, texte, statut, format, validee_at")
    .eq("patient_id", params.id)
    .eq("date_soin", todayISO())
    .maybeSingle();

  const validatedPassages = (passages ?? []).filter((p) => p.statut === "valide");

  return (
    <div className="space-y-5">
      <div>
        <Link href="/patients" className="text-sm text-slate-400">← Patients</Link>
        <h1 className="mt-1 text-lg font-semibold">
          {patient.nom.toUpperCase()} {patient.prenom}
        </h1>
        <p className="text-xs text-slate-400">Né(e) le {patient.date_naissance ?? "—"}</p>
      </div>

      <Link
        href={`/patients/${patient.id}/record`}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 font-medium text-white"
      >
        🎙️ Nouvelle dictée
      </Link>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Passages du jour ({(passages ?? []).length})
        </h2>
        <ul className="space-y-2">
          {(passages ?? []).map((p) => (
            <li key={p.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-medium text-slate-500">
                  {new Date(p.recorded_at).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span
                  className={
                    p.statut === "valide"
                      ? "rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700"
                      : "rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700"
                  }
                >
                  {p.statut === "valide" ? "validé" : "brouillon"}
                </span>
              </div>
              <p className="text-slate-700">
                {p.transcript_corrige || p.transcript_raw || <em className="text-slate-400">—</em>}
              </p>
              {p.statut !== "valide" && (
                <Link
                  href={`/patients/${patient.id}/record?passage=${p.id}`}
                  className="mt-1 inline-block text-xs text-brand underline"
                >
                  Relire et valider
                </Link>
              )}
            </li>
          ))}
          {(!passages || passages.length === 0) && (
            <li className="rounded-lg border border-dashed p-4 text-center text-sm text-slate-400">
              Aucun passage aujourd'hui.
            </li>
          )}
        </ul>
      </section>

      <GenerateTransmission
        patientId={patient.id}
        transmission={transmission}
        validatedCount={validatedPassages.length}
      />
    </div>
  );
}

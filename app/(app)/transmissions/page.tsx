import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Toutes les transmissions validées du cabinet (visibilité partagée V1).
export default async function TransmissionsPage() {
  const supabase = createClient();
  const { data: transmissions } = await supabase
    .from("transmissions")
    .select("id, date_soin, texte, statut, patient_id, patients(nom, prenom)")
    .eq("statut", "validee")
    .order("date_soin", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">Transmissions validées</h1>
      <ul className="space-y-3">
        {(transmissions ?? []).map((t) => {
          const patient = (Array.isArray(t.patients) ? t.patients[0] : t.patients) as
            | { nom: string; prenom: string }
            | null;
          return (
            <li key={t.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between text-sm">
                <Link href={`/patients/${t.patient_id}`} className="font-medium text-brand-dark">
                  {patient ? `${patient.nom.toUpperCase()} ${patient.prenom}` : "Patient"}
                </Link>
                <span className="text-xs text-slate-400">
                  {new Date(t.date_soin).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{t.texte}</pre>
            </li>
          );
        })}
        {(!transmissions || transmissions.length === 0) && (
          <li className="rounded-lg border border-dashed p-6 text-center text-sm text-slate-400">
            Aucune transmission validée.
          </li>
        )}
      </ul>
    </div>
  );
}

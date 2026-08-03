import { createClient } from "@/lib/supabase/server";
import AddPatientForm from "./add-patient-form";
import PatientsList from "./patients-list";

export const dynamic = "force-dynamic";

export default async function PatientsPage() {
  const supabase = createClient();
  const { data: patients } = await supabase
    .from("patients")
    .select("id, nom, prenom, date_naissance")
    .order("nom", { ascending: true })
    .order("prenom", { ascending: true });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Patients</h1>
        <span className="text-sm text-slate-400">{patients?.length ?? 0}</span>
      </div>

      <AddPatientForm />

      <PatientsList
        patients={(patients ?? []).map((p) => ({
          id: p.id as string,
          nom: p.nom as string,
          prenom: p.prenom as string,
          date_naissance: (p.date_naissance as string | null) ?? null,
        }))}
      />
    </div>
  );
}

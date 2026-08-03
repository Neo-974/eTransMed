import { createClient } from "@/lib/supabase/server";
import MembersManager from "../parametres/members-manager";
import CopyCode from "./copy-code";
import CreatePractitioner from "./create-practitioner";

export const dynamic = "force-dynamic";

export default async function PraticiensPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("cabinet_id, role")
    .eq("id", userData.user!.id)
    .single();

  const isManager = ["titulaire", "admin"].includes(profile?.role as string);

  const { data: cabinet } = await supabase
    .from("cabinets")
    .select("code_invitation")
    .eq("id", profile!.cabinet_id)
    .single();

  const { data: membres } = await supabase
    .from("profiles")
    .select("id, nom_complet, role")
    .order("nom_complet");

  // "actif" tolérant : si la colonne n'existe pas encore, tout le monde est actif.
  const { data: actifs } = await supabase.from("profiles").select("id, actif");
  const actifMap = new Map(
    (actifs ?? []).map((a) => [a.id as string, (a as { actif?: boolean }).actif !== false])
  );

  const code = cabinet?.code_invitation ?? "—";

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-semibold">Praticiens</h1>

      {/* Inscrire un praticien */}
      <section className="space-y-3 rounded-lg border border-brand bg-teal-50 p-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-dark">
            Inscrire un praticien
          </p>
          <div className="mt-1 flex items-center gap-3">
            <span className="font-mono text-2xl font-bold tracking-widest text-slate-900">{code}</span>
            <CopyCode code={cabinet?.code_invitation ?? ""} />
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Partagez ce code : le praticien s&apos;inscrit via « Rejoindre un cabinet ».
          </p>
        </div>

        {isManager && (
          <div className="border-t border-brand/20 pt-3">
            <p className="mb-2 text-xs text-slate-600">
              Ou créez-le directement, avec son mot de passe :
            </p>
            <CreatePractitioner />
          </div>
        )}
      </section>

      {/* Liste + gestion */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">
          Membres du cabinet ({membres?.length ?? 0})
        </h2>
        <MembersManager
          members={(membres ?? []).map((m) => ({
            id: m.id as string,
            nom_complet: m.nom_complet,
            role: m.role as string,
            actif: actifMap.get(m.id as string) ?? true,
          }))}
          currentUserId={userData.user!.id}
          isManager={isManager}
        />
      </section>
    </div>
  );
}

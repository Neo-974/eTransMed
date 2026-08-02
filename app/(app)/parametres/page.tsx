import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ParametresForm from "./parametres-form";

export const dynamic = "force-dynamic";

export default async function ParametresPage() {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("cabinet_id")
    .eq("id", userData.user!.id)
    .single();

  const { data: cabinet } = await supabase
    .from("cabinets")
    .select("id, nom, description, code_invitation")
    .eq("id", profile!.cabinet_id)
    .single();

  return (
    <div className="space-y-5">
      <div>
        <Link href="/accueil" className="text-sm text-slate-400">← Accueil</Link>
        <h1 className="mt-1 text-lg font-semibold">Paramètres du cabinet</h1>
      </div>

      <ParametresForm
        cabinetId={cabinet?.id as string}
        nom={cabinet?.nom ?? ""}
        description={cabinet?.description ?? ""}
        codeInvitation={cabinet?.code_invitation ?? "—"}
      />

      <p className="text-xs text-slate-400">
        La gestion des praticiens (rôles, retrait) se fait dans l&apos;onglet « Praticiens ».
      </p>
    </div>
  );
}

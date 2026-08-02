import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ROLES = ["collaborateur", "remplacant", "admin", "titulaire"];

// Crée un praticien (compte + profil) dans le cabinet du demandeur.
// Réservé aux rôles admin / titulaire. Utilise la clé service_role côté serveur.
export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json(
      { error: "Fonction non configurée : la clé service_role est absente côté serveur (Vercel)." },
      { status: 501 }
    );
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { data: me } = await supabase
    .from("profiles")
    .select("cabinet_id, role")
    .eq("id", user.id)
    .single();
  if (!me?.cabinet_id || !["titulaire", "admin"].includes(me.role as string)) {
    return NextResponse.json({ error: "Accès réservé au titulaire / admin." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");
  const nom = String(body?.nom ?? "").trim();
  const role = ROLES.includes(body?.role) ? body.role : "collaborateur";
  if (!email || !nom || password.length < 6) {
    return NextResponse.json(
      { error: "Email, nom et mot de passe (≥ 6 caractères) requis." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created.user) {
    return NextResponse.json({ error: cErr?.message ?? "Création du compte impossible." }, { status: 400 });
  }

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    cabinet_id: me.cabinet_id,
    nom_complet: nom,
    role,
  });
  if (pErr) {
    // Évite un compte orphelin si le profil échoue
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return NextResponse.json({ error: pErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

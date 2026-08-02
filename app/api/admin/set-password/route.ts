import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Définit le mot de passe d'un praticien du même cabinet.
// Réservé aux rôles admin / titulaire.
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
  const targetId = String(body?.targetId ?? "");
  const password = String(body?.password ?? "");
  if (!targetId || password.length < 6) {
    return NextResponse.json({ error: "Mot de passe ≥ 6 caractères requis." }, { status: 400 });
  }

  const admin = createAdminClient();
  // Le praticien cible doit appartenir au même cabinet
  const { data: target } = await admin
    .from("profiles")
    .select("cabinet_id")
    .eq("id", targetId)
    .single();
  if (!target || target.cabinet_id !== me.cabinet_id) {
    return NextResponse.json({ error: "Praticien introuvable dans votre cabinet." }, { status: 404 });
  }

  const { error } = await admin.auth.admin.updateUserById(targetId, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}

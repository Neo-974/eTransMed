import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Supprime DÉFINITIVEMENT un praticien (compte + profil) du même cabinet.
// Réservé aux rôles admin / titulaire. Ne peut pas se supprimer soi-même.
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
  if (!targetId) return NextResponse.json({ error: "Praticien manquant." }, { status: 400 });
  if (targetId === user.id) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("cabinet_id")
    .eq("id", targetId)
    .single();
  if (!target || target.cabinet_id !== me.cabinet_id) {
    return NextResponse.json({ error: "Praticien introuvable dans votre cabinet." }, { status: 404 });
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    const msg = /foreign key|violates|constraint/i.test(error.message)
      ? "Ce praticien a des transmissions liées : utilisez « Retirer » (détacher du cabinet) plutôt que de supprimer le compte."
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

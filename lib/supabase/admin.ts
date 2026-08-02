import { createClient as createJsClient } from "@supabase/supabase-js";

// Client Supabase ADMIN (clé service_role) — UNIQUEMENT côté serveur (routes API).
// La clé service_role contourne la RLS : ne jamais l'exposer au navigateur ni au dépôt.
export function createAdminClient() {
  return createJsClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export function adminConfigured() {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

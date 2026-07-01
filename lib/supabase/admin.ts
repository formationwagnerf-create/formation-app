import { createClient } from "@supabase/supabase-js";

// Ce client utilise la clé service_role, qui contourne la RLS.
// À N'UTILISER QUE dans des actions serveur explicitement contrôlées
// (ex. inviter un utilisateur), jamais exposé au navigateur, jamais
// utilisé pour des lectures/écritures classiques (celles-ci doivent
// toujours passer par lib/supabase/server.ts pour rester protégées
// par les policies RLS).
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

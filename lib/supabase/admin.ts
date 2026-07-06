import { createClient } from "@supabase/supabase-js";

// Service-Role-Client – ausschließlich serverseitig verwenden (Cron, zukünftige Pipeline-Jobs).
// Umgeht RLS bewusst; nie in Client Components importieren.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

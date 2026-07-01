import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import OrganizationUsersClient from "./organization-users-client";

export default async function OrganizationUsersPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) redirect("/espace");

  const { data: orgUsers } = await supabase
    .from("organization_users")
    .select("user_id, is_org_admin, users(email, first_name, last_name)")
    .eq("organization_id", profile.organization_id);

  return (
    <OrganizationUsersClient
      organizationId={profile.organization_id}
      initialUsers={(orgUsers as any) ?? []}
    />
  );
}

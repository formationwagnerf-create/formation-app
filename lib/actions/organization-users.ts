"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type InviteResult = { success: true } | { success: false; error: string };

/**
 * Permet à l'administrateur d'un compte client d'ajouter un collègue de
 * son organisme. Avant tout, on vérifie via le client normal (donc soumis
 * à la RLS) que l'appelant est bien org_admin de CET organisme précis —
 * ce n'est qu'après cette vérification qu'on utilise le client service_role
 * pour créer le compte invité.
 */
export async function inviteOrganizationUser(
  organizationId: string,
  email: string,
  firstName: string,
  lastName: string
): Promise<InviteResult> {
  const callerClient = await createSupabaseServerClient();
  const { data: isAllowed } = await callerClient.rpc("is_org_admin_of", {
    target_org: organizationId,
  });

  if (!isAllowed) {
    return { success: false, error: "Vous n'êtes pas autorisé à gérer cet organisme." };
  }

  const supabase = createSupabaseAdminClient();

  const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    { data: { first_name: firstName, last_name: lastName } }
  );

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Échec de l'invitation" };
  }

  await supabase
    .from("users")
    .update({ organization_id: organizationId, role: "client_user", first_name: firstName, last_name: lastName })
    .eq("id", authData.user.id);

  const { error: linkError } = await supabase.from("organization_users").insert({
    organization_id: organizationId,
    user_id: authData.user.id,
    is_org_admin: false,
  });

  if (linkError) {
    return { success: false, error: linkError.message };
  }

  return { success: true };
}

/**
 * Retire un utilisateur de l'organisme (sans supprimer son compte global,
 * au cas où il appartiendrait par erreur ou serait réinvité plus tard).
 */
export async function removeOrganizationUser(organizationId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("organization_users")
    .delete()
    .eq("organization_id", organizationId)
    .eq("user_id", userId);

  if (error) {
    return { success: false as const, error: error.message };
  }
  return { success: true as const };
}

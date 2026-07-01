"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  organizationSignupSchema,
  type OrganizationSignupInput,
} from "@/lib/validation/organization-signup";

export type SignupResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Crée un compte organisme + son premier utilisateur (administrateur de
 * l'organisme). C'est ce flux qui, une fois terminé, débloque l'accès aux
 * tarifs (privés jusque-là) et au calendrier de réservation.
 *
 * Étapes :
 * 1. Création de l'utilisateur dans Supabase Auth (envoi d'un e-mail de
 *    vérification).
 * 2. Création de la ligne organizations avec toutes les informations
 *    administratives demandées.
 * 3. Lien entre l'utilisateur et l'organisme, avec le rôle "org_admin"
 *    (il pourra ensuite ajouter d'autres utilisateurs de son organisme).
 */
export async function signUpOrganization(
  input: OrganizationSignupInput
): Promise<SignupResult> {
  const parsed = organizationSignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message ?? "Données invalides" };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServerClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: {
        first_name: data.contactFirstName,
        last_name: data.contactLastName,
      },
    },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? "Échec de la création du compte" };
  }

  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({
      legal_name: data.legalName,
      siret: data.siret || null,
      vat_number: data.vatNumber || null,
      admin_address: data.adminAddress,
      billing_address: data.billingAddress,
      email: data.email,
      phone: data.phone,
      contact_first_name: data.contactFirstName,
      contact_last_name: data.contactLastName,
      contact_role: data.contactRole,
      purchase_order_number: data.purchaseOrderNumber || null,
      notes: data.notes || null,
    })
    .select("id")
    .single();

  if (orgError || !org) {
    return { success: false, error: "Échec de la création de l'organisme : " + orgError?.message };
  }

  // Met à jour le profil utilisateur créé automatiquement par le trigger
  // Supabase (voir migration 0004) avec son organisme et son rôle.
  const { error: userUpdateError } = await supabase
    .from("users")
    .update({
      organization_id: org.id,
      role: "org_admin",
      first_name: data.contactFirstName,
      last_name: data.contactLastName,
      phone: data.phone,
    })
    .eq("id", authData.user.id);

  if (userUpdateError) {
    return { success: false, error: "Échec du rattachement à l'organisme : " + userUpdateError.message };
  }

  const { error: linkError } = await supabase.from("organization_users").insert({
    organization_id: org.id,
    user_id: authData.user.id,
    is_org_admin: true,
  });

  if (linkError) {
    return { success: false, error: "Échec du lien organisme/utilisateur : " + linkError.message };
  }

  return { success: true };
}

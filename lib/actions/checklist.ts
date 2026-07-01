"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Réservé à l'administrateur");
  return supabase;
}

const DEFAULT_CHECKLIST_LABELS = [
  "Demande reçue",
  "Tarif validé",
  "Dates validées",
  "Devis transmis",
  "Devis accepté",
  "Convention reçue",
  "Bon de commande reçu",
  "Programme transmis",
  "Nombre de participants confirmé",
  "Documents reçus",
  "Formation réalisée",
  "Nombre réel de stagiaires renseigné",
  "Questionnaire de satisfaction envoyé",
  "Facture enregistrée",
  "Paiement reçu",
  "Dossier archivé",
];

/**
 * Applique une checklist à un dossier. Si aucun modèle n'est précisé, on
 * utilise la liste par défaut du cahier des charges (§17). On peut aussi
 * appliquer un modèle spécifique à une formation précise.
 */
export async function applyChecklistToBooking(bookingId: string, checklistId?: string) {
  const supabase = await assertAdmin();

  let items: { label: string; is_required: boolean; is_automatic: boolean }[];

  if (checklistId) {
    const { data: template } = await supabase
      .from("booking_checklists")
      .select("id")
      .eq("id", checklistId)
      .single();
    if (!template) throw new Error("Modèle de checklist introuvable");

    const { data: templateItems } = await supabase
      .from("booking_checklist_items")
      .select("label, is_required, is_automatic")
      .eq("checklist_id", checklistId)
      .is("booking_request_id", null)
      .order("display_order", { ascending: true });

    items = templateItems ?? [];
  } else {
    items = DEFAULT_CHECKLIST_LABELS.map((label) => ({
      label,
      is_required: false,
      is_automatic: false,
    }));
  }

  const { error } = await supabase.from("booking_checklist_items").insert(
    items.map((item, index) => ({
      checklist_id: checklistId ?? null,
      booking_request_id: bookingId,
      label: item.label,
      is_required: item.is_required,
      is_automatic: item.is_automatic,
      display_order: index,
    }))
  );
  if (error) throw new Error(error.message);
}

export async function toggleChecklistItem(itemId: string, isDone: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("booking_checklist_items")
    .update({ is_done: isDone, done_at: isDone ? new Date().toISOString() : null })
    .eq("id", itemId);
  if (error) throw new Error(error.message);
}

export async function addChecklistItem(bookingId: string, label: string) {
  const supabase = await assertAdmin();
  const { data: existing } = await supabase
    .from("booking_checklist_items")
    .select("display_order")
    .eq("booking_request_id", bookingId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("booking_checklist_items").insert({
    booking_request_id: bookingId,
    label,
    display_order: (existing?.display_order ?? -1) + 1,
  });
  if (error) throw new Error(error.message);
}

export async function removeChecklistItem(itemId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("booking_checklist_items").delete().eq("id", itemId);
  if (error) throw new Error(error.message);
}

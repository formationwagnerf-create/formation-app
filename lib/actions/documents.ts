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

// ---- Documents professionnels (CV, Qualiopi, assurance, CGV...) ----

export async function addProfessionalDocument(input: {
  name: string;
  category: string;
  fileUrl: string;
  description?: string;
  expiresAt?: string;
  expiryAlertDays?: number;
}) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("professional_documents").insert({
    name: input.name,
    category: input.category,
    file_url: input.fileUrl,
    description: input.description,
    expires_at: input.expiresAt || null,
    expiry_alert_days: input.expiryAlertDays ?? 30,
    published_at: new Date().toISOString().slice(0, 10),
  });
  if (error) throw new Error(error.message);
}

export async function setProfessionalDocumentVisibility(docId: string, isVisible: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("professional_documents")
    .update({ is_visible: isVisible })
    .eq("id", docId);
  if (error) throw new Error(error.message);
}

export async function deleteProfessionalDocument(docId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("professional_documents").delete().eq("id", docId);
  if (error) throw new Error(error.message);
}

// ---- Types de documents demandés au client (devis signé, convention...) ----

export async function addRequestedDocumentType(input: {
  name: string;
  isRequired: boolean;
  appliesToAllCourses: boolean;
  courseId?: string;
  organizationId?: string;
  comment?: string;
}) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("requested_document_types").insert({
    name: input.name,
    is_required: input.isRequired,
    applies_to_all_courses: input.appliesToAllCourses,
    course_id: input.courseId || null,
    organization_id: input.organizationId || null,
    comment: input.comment,
  });
  if (error) throw new Error(error.message);
}

// ---- Documents déposés par le client sur un dossier ----

export async function updateBookingDocumentStatus(
  bookingDocId: string,
  status: "received" | "under_review" | "validated" | "refused" | "to_replace"
) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("booking_documents")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingDocId);
  if (error) throw new Error(error.message);
}

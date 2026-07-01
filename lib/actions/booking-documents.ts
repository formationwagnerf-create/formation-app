"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const ACCEPTED_FORMATS = ["pdf", "docx", "xlsx", "jpg", "jpeg", "png"];
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15 Mo

/**
 * Dépôt d'un document par un client sur son propre dossier. La RLS sur
 * booking_documents garantit déjà qu'un client ne peut écrire que sur les
 * dossiers de son organisme ; on valide en plus le format et la taille du
 * fichier avant stockage (cahier des charges §13 et §27).
 */
export async function uploadBookingDocument(
  bookingId: string,
  documentTypeId: string,
  file: File
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_FORMATS.includes(extension)) {
    throw new Error(`Format non accepté. Formats autorisés : ${ACCEPTED_FORMATS.join(", ")}`);
  }
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error("Le fichier dépasse la taille maximale autorisée (15 Mo)");
  }

  const path = `${bookingId}/${Date.now()}_${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("booking-documents")
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw new Error(uploadError.message);

  const { error } = await supabase.from("booking_documents").insert({
    booking_request_id: bookingId,
    document_type_id: documentTypeId,
    file_url: path,
    file_name: file.name,
    status: "received",
    uploaded_by: user.id,
  });
  if (error) throw new Error(error.message);
}

/**
 * Génère un lien temporaire et sécurisé pour télécharger un document
 * stocké dans le bucket privé (cahier des charges §27 : "liens
 * temporaires sécurisés pour les téléchargements").
 */
export async function getSignedDocumentUrl(path: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.storage
    .from("booking-documents")
    .createSignedUrl(path, 60 * 10); // valable 10 minutes
  if (error || !data) throw new Error("Impossible de générer le lien de téléchargement");
  return data.signedUrl;
}

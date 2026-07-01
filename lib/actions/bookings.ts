"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePriceForOrganization } from "@/lib/pricing";
import { sendWhatsAppNotification, formatNewRequestMessage } from "@/lib/whatsapp";
import { syncBookingToGoogleCalendar, removeBookingFromGoogleCalendar } from "@/lib/google-calendar";

export type BookingRequestInput = {
  courseId: string;
  startDate: string;
  endDate: string;
  numberOfDays: number;
  dayFormat: "full_day" | "half_day";
  expectedParticipants: number;
  venueName: string;
  venueAddress: string;
  onSiteContactName: string;
  onSiteContactPhone: string;
  comment?: string;
  isCustomRequest?: boolean;
};

/**
 * Crée une demande de réservation. Ce n'est jamais une réservation ferme
 * (cahier des charges §6) : elle entre directement au statut "received"
 * et devra être étudiée manuellement par l'administrateur.
 *
 * Le tarif applicable est résolu et COPIÉ sur la demande à cet instant
 * précis (snapshot), pour qu'un changement ultérieur du tarif général ou
 * spécifique ne modifie jamais ce dossier rétroactivement.
 */
export async function createBookingRequest(input: BookingRequestInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) throw new Error("Aucun organisme associé à ce compte");

  const price = await resolvePriceForOrganization(input.courseId, profile.organization_id);

  const { data: booking, error } = await supabase
    .from("booking_requests")
    .insert({
      organization_id: profile.organization_id,
      created_by: user.id,
      course_id: input.courseId,
      status: "received",
      start_date: input.startDate,
      end_date: input.endDate,
      number_of_days: input.numberOfDays,
      day_format: input.dayFormat,
      expected_participants: input.expectedParticipants,
      venue_name: input.venueName,
      venue_address: input.venueAddress,
      on_site_contact_name: input.onSiteContactName,
      on_site_contact_phone: input.onSiteContactPhone,
      comment: input.comment,
      is_custom_request: input.isCustomRequest ?? false,
      applied_daily_price: price?.dailyPrice ?? null,
      applied_half_day_price: price?.halfDayPrice ?? null,
      applied_price_comment: price?.comment ?? null,
    })
    .select("id")
    .single();

  if (error || !booking) throw new Error(error?.message ?? "Échec de la création de la demande");

  await supabase.from("booking_status_history").insert({
    booking_request_id: booking.id,
    old_status: null,
    new_status: "received",
    changed_by: user.id,
    comment: "Demande créée par le client",
  });

  // Génère les lignes "participants par jour" sur lesquelles l'admin
  // pourra ensuite saisir le nombre réel, indépendamment du prévu.
  const days = generateSessionDays(input.startDate, input.numberOfDays, input.dayFormat);
  const adminSupabase = createSupabaseAdminClient();
  await adminSupabase.from("booking_session_days").insert(
    days.map((d) => ({
      booking_request_id: booking.id,
      session_date: d.date,
      half_day: d.halfDay,
      expected_participants: input.expectedParticipants,
    }))
  );

  // Notification WhatsApp à l'administrateur (informative uniquement,
  // la validation se fait dans l'application).
  const { data: org } = await supabase
    .from("organizations")
    .select("legal_name")
    .eq("id", profile.organization_id)
    .single();
  const { data: course } = await supabase
    .from("training_courses")
    .select("title")
    .eq("id", input.courseId)
    .single();

  await sendWhatsAppNotification(
    "new_request",
    formatNewRequestMessage({
      organizationName: org?.legal_name ?? "Organisme",
      courseName: course?.title ?? "Formation",
      startDate: input.startDate,
      endDate: input.endDate,
      venue: input.venueAddress,
      requestUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/demandes/${booking.id}`,
    }),
    booking.id
  );

  return booking.id as string;
}

function generateSessionDays(
  startDate: string,
  numberOfDays: number,
  dayFormat: "full_day" | "half_day"
) {
  const days: { date: string; halfDay: "morning" | "afternoon" | "full" }[] = [];
  const start = new Date(startDate);

  for (let i = 0; i < Math.ceil(numberOfDays); i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);

    if (dayFormat === "half_day") {
      days.push({ date: dateStr, halfDay: "morning" });
      if (numberOfDays - i >= 1) days.push({ date: dateStr, halfDay: "afternoon" });
    } else {
      days.push({ date: dateStr, halfDay: "full" });
    }
  }
  return days;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["received"],
  received: ["under_review", "refused"],
  under_review: ["option_proposed", "confirmed_final", "refused"],
  option_proposed: ["option_accepted", "expired", "cancelled_by_client"],
  option_accepted: ["awaiting_client_confirmation", "confirmed_final"],
  awaiting_client_confirmation: ["confirmed_by_client", "expired"],
  confirmed_by_client: ["confirmed_final"],
  confirmed_final: ["scheduled", "cancelled_by_admin", "cancelled_by_client"],
  scheduled: ["completed", "cancelled_by_admin"],
  completed: ["archived"],
};

/**
 * Change le statut d'une demande, en enregistrant systématiquement
 * l'historique (date, auteur, ancien/nouveau statut, commentaire), comme
 * demandé au §7. Au passage en "confirmed_final", verrouille le calendrier
 * pour empêcher deux organismes de confirmer la même date.
 */
export async function changeBookingStatus(
  bookingId: string,
  newStatus: string,
  comment?: string
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: booking } = await supabase
    .from("booking_requests")
    .select("status, is_locked, start_date, end_date, day_format")
    .eq("id", bookingId)
    .single();
  if (!booking) throw new Error("Demande introuvable");
  if (booking.is_locked) throw new Error("Ce dossier est verrouillé");

  const allowed = VALID_TRANSITIONS[booking.status] ?? [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Transition de "${booking.status}" vers "${newStatus}" non autorisée`);
  }

  if (newStatus === "confirmed_final" && booking.start_date && booking.end_date) {
    const halfDay = booking.day_format === "half_day" ? "morning" : "full";
    const { data: locked } = await supabase.rpc("lock_calendar_for_booking", {
      p_booking_id: bookingId,
      p_start: booking.start_date,
      p_end: booking.end_date,
      p_half_day: halfDay,
    });
    if (!locked) {
      throw new Error(
        "Conflit de calendrier : ces dates ont déjà été confirmées pour un autre dossier"
      );
    }
  }

  const { error } = await supabase
    .from("booking_requests")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) throw new Error(error.message);

  await supabase.from("booking_status_history").insert({
    booking_request_id: bookingId,
    old_status: booking.status,
    new_status: newStatus,
    changed_by: user.id,
    comment,
  });

  // Synchronisation Google Agenda : une confirmation définitive crée/met à
  // jour l'événement, une annulation le supprime (cahier des charges §9).
  // On récupère les infos nécessaires sans bloquer le changement de statut
  // si la synchronisation échoue (l'application reste la source de vérité).
  try {
    if (newStatus === "confirmed_final" || newStatus === "scheduled") {
      const { data: full } = await supabase
        .from("booking_requests")
        .select("id, start_date, end_date, venue_address, organizations(legal_name), training_courses(title)")
        .eq("id", bookingId)
        .single();
      if (full?.start_date && full.end_date) {
        await syncBookingToGoogleCalendar({
          id: full.id,
          title: (full as any).training_courses?.title ?? "Formation",
          startDate: full.start_date,
          endDate: full.end_date,
          venueAddress: full.venue_address ?? "",
          organizationName: (full as any).organizations?.legal_name ?? "",
        });
      }
    } else if (newStatus === "cancelled_by_admin" || newStatus === "cancelled_by_client") {
      await removeBookingFromGoogleCalendar(bookingId);

      await sendWhatsAppNotification(
        "cancellation",
        `Formation annulée\n\nDossier : ${bookingId}\nNouveau statut : ${newStatus}`,
        bookingId
      );
    }
  } catch {
    // La synchronisation Google Agenda est secondaire : son échec ne doit
    // jamais empêcher la mise à jour du statut, qui reste la donnée fiable.
  }
}

/**
 * Saisie/modification du nombre réel de participants par jour ou
 * demi-journée, librement par l'administrateur, à tout moment avant
 * verrouillage du dossier.
 */
export async function setActualParticipants(sessionDayId: string, actualParticipants: number) {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", (await supabase.auth.getUser()).data.user?.id)
    .single();
  if (profile?.role !== "admin") throw new Error("Réservé à l'administrateur");

  const { error } = await supabase
    .from("booking_session_days")
    .update({ actual_participants: actualParticipants, updated_at: new Date().toISOString() })
    .eq("id", sessionDayId);
  if (error) throw new Error(error.message);
}

/**
 * Synchronisation avec un calendrier Google dédié (cahier des charges
 * §9), ex. "Planning Formations François Wagner". On n'utilise jamais un
 * accès complet à l'agenda personnel : uniquement ce calendrier précis,
 * identifié par GOOGLE_CALENDAR_ID, via un compte de service.
 */
import { google } from "googleapis";
import { createSupabaseAdminClient } from "./supabase/admin";

function getCalendarClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  });
  return google.calendar({ version: "v3", auth });
}

type BookingForSync = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  venueAddress: string;
  organizationName: string;
};

/**
 * Crée ou met à jour l'événement Google Agenda correspondant à un
 * dossier. Évite les doublons : si un événement existe déjà pour ce
 * dossier (calendar_sync_events), on le met à jour plutôt que d'en créer
 * un nouveau.
 */
export async function syncBookingToGoogleCalendar(booking: BookingForSync) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return; // intégration non configurée, on ignore silencieusement

  const supabase = createSupabaseAdminClient();
  const calendar = getCalendarClient();

  const { data: existing } = await supabase
    .from("calendar_sync_events")
    .select("id, google_event_id")
    .eq("booking_request_id", booking.id)
    .eq("status", "synced")
    .maybeSingle();

  const eventBody = {
    summary: `${booking.title} — ${booking.organizationName}`,
    location: booking.venueAddress,
    start: { date: booking.startDate },
    end: { date: booking.endDate },
  };

  try {
    if (existing?.google_event_id) {
      await calendar.events.update({
        calendarId,
        eventId: existing.google_event_id,
        requestBody: eventBody,
      });
    } else {
      const created = await calendar.events.insert({
        calendarId,
        requestBody: eventBody,
      });
      await supabase.from("calendar_sync_events").insert({
        booking_request_id: booking.id,
        google_event_id: created.data.id,
        status: "synced",
      });
    }
  } catch (err) {
    await supabase.from("calendar_sync_events").insert({
      booking_request_id: booking.id,
      google_event_id: existing?.google_event_id ?? "error",
      status: "error",
    });
    throw err;
  }
}

/**
 * Supprime (ou marque annulé) l'événement Google Agenda correspondant à
 * un dossier annulé.
 */
export async function removeBookingFromGoogleCalendar(bookingId: string) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return;

  const supabase = createSupabaseAdminClient();
  const calendar = getCalendarClient();

  const { data: existing } = await supabase
    .from("calendar_sync_events")
    .select("id, google_event_id")
    .eq("booking_request_id", bookingId)
    .eq("status", "synced")
    .maybeSingle();

  if (!existing?.google_event_id) return;

  await calendar.events.delete({ calendarId, eventId: existing.google_event_id });
  await supabase.from("calendar_sync_events").update({ status: "deleted" }).eq("id", existing.id);
}

import { createSupabaseServerClient } from "./supabase/server";

/**
 * Fait avancer la fenêtre de réservation disponible pour les clients.
 *
 * Fonctionnement :
 * - La base de données génère déjà les jours du calendrier jusqu'à
 *   "aujourd'hui + N années" (N = paramètre "calendar_rolling_years",
 *   2 par défaut, modifiable dans Paramètres > Calendrier).
 * - Cette fonction appelle la fonction SQL extend_calendar_window(), qui
 *   ajoute les jours manquants entre le dernier jour déjà généré et la
 *   nouvelle date cible.
 * - Comme la date cible avance d'un jour chaque jour, la fenêtre de
 *   réservation "glisse" automatiquement, sans jamais avoir une fin figée
 *   dans le temps. Pas besoin d'intervention manuelle chaque année.
 *
 * Cette fonction doit être appelée une fois par jour par une tâche
 * planifiée (voir app/api/cron/extend-calendar/route.ts et docs/CRON.md).
 */
export async function extendCalendarWindow() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("extend_calendar_window");
  if (error) {
    throw new Error(`Échec de l'extension du calendrier : ${error.message}`);
  }
}

export type DayAvailability = {
  day: string;
  half_day: "morning" | "afternoon" | "full";
  availability: "available" | "unavailable";
};

/**
 * Récupère les disponibilités visibles par un client, sur la fenêtre
 * glissante de 2 ans (ou la durée configurée). Le client ne reçoit jamais
 * la raison d'une indisponibilité, uniquement l'état.
 */
export async function getClientAvailability(fromDate: string, toDate: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("calendar_public_view")
    .select("day, half_day, availability")
    .gte("day", fromDate)
    .lte("day", toDate)
    .order("day", { ascending: true });

  if (error) {
    throw new Error(`Impossible de charger le calendrier : ${error.message}`);
  }

  return data as DayAvailability[];
}

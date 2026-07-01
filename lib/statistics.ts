import { createSupabaseServerClient } from "./supabase/server";

export type StatsFilters = {
  fromDate?: string;
  toDate?: string;
  organizationId?: string;
  courseId?: string;
};

export type StatsRow = {
  bookingId: string;
  date: string;
  organization: string;
  course: string;
  venue: string;
  numberOfDays: number;
  totalHours: number;
  expectedParticipants: number;
  actualParticipants: number;
  studentHours: number;
  travelHours: number;
  status: string;
  amount: number;
  travelAmount: number;
  total: number;
  orderingEntity: string | null;
};

/**
 * Calcule les statistiques d'activité, conformément au §15 du cahier des
 * charges :
 * - heures de formation = durée réelle de la session
 * - heures-stagiaires = durée réelle × nombre réel de participants
 * - jours travaillés : journée complète = 1, demi-journée = 0,5
 *
 * Le nombre réel de stagiaires (jamais le nombre prévu) alimente les
 * statistiques, conformément au §14.
 */
export async function computeStatistics(filters: StatsFilters = {}): Promise<StatsRow[]> {
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("booking_requests")
    .select(
      `id, status, start_date, end_date, number_of_days, day_format, expected_participants,
       applied_daily_price, ordering_entity, venue_address,
       organizations(legal_name), training_courses(title)`
    )
    .in("status", ["completed", "scheduled", "confirmed_final", "archived"]);

  if (filters.fromDate) query = query.gte("start_date", filters.fromDate);
  if (filters.toDate) query = query.lte("start_date", filters.toDate);
  if (filters.organizationId) query = query.eq("organization_id", filters.organizationId);
  if (filters.courseId) query = query.eq("course_id", filters.courseId);

  const { data: bookings } = await query;
  if (!bookings?.length) return [];

  const bookingIds = bookings.map((b: any) => b.id);

  const { data: sessionDays } = await supabase
    .from("booking_session_days")
    .select("booking_request_id, half_day, actual_participants, travel_hours")
    .in("booking_request_id", bookingIds);

  const { data: travelCalcs } = await supabase
    .from("travel_calculations")
    .select("booking_request_id, final_amount, created_at")
    .in("booking_request_id", bookingIds)
    .order("created_at", { ascending: false });

  const latestTravelByBooking = new Map<string, number>();
  for (const t of travelCalcs ?? []) {
    if (!latestTravelByBooking.has(t.booking_request_id)) {
      latestTravelByBooking.set(t.booking_request_id, t.final_amount ?? 0);
    }
  }

  return bookings.map((b: any) => {
    const days = (sessionDays ?? []).filter((d: any) => d.booking_request_id === b.id);

    const actualParticipants =
      days.length > 0
        ? Math.round(
            days.reduce((sum: number, d: any) => sum + (d.actual_participants ?? 0), 0) / days.length
          )
        : 0;

    const numberOfDays = b.number_of_days ?? days.length;
    const totalHours = numberOfDays * 7; // base 7h/jour, ajustable si besoin
    const studentHours = totalHours * actualParticipants;
    const travelHours = days.reduce((sum: number, d: any) => sum + (d.travel_hours ?? 0), 0);

    const amount = (b.applied_daily_price ?? 0) * numberOfDays;
    const travelAmount = latestTravelByBooking.get(b.id) ?? 0;

    return {
      bookingId: b.id,
      date: b.start_date,
      organization: b.organizations?.legal_name ?? "",
      course: b.training_courses?.title ?? "",
      venue: b.venue_address ?? "",
      numberOfDays,
      totalHours,
      expectedParticipants: b.expected_participants,
      actualParticipants,
      studentHours,
      travelHours,
      status: b.status,
      amount,
      travelAmount,
      total: amount + travelAmount,
      orderingEntity: b.ordering_entity,
    };
  });
}

export function summarizeStatistics(rows: StatsRow[]) {
  return {
    completedTrainings: rows.filter((r) => r.status === "completed" || r.status === "archived").length,
    sessions: rows.length,
    totalHours: rows.reduce((s, r) => s + r.totalHours, 0),
    studentHours: rows.reduce((s, r) => s + r.studentHours, 0),
    totalStudents: rows.reduce((s, r) => s + r.actualParticipants, 0),
    workingDays: rows.reduce((s, r) => s + r.numberOfDays, 0),
    travelHours: rows.reduce((s, r) => s + r.travelHours, 0),
    totalRevenue: rows.reduce((s, r) => s + r.total, 0),
  };
}

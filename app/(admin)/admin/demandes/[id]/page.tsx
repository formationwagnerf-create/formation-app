import { createSupabaseServerClient } from "@/lib/supabase/server";
import BookingDetailClient from "./booking-detail-client";

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*, organizations(legal_name), training_courses(title)")
    .eq("id", id)
    .single();

  const { data: history } = await supabase
    .from("booking_status_history")
    .select("old_status, new_status, comment, created_at, users(first_name, last_name)")
    .eq("booking_request_id", id)
    .order("created_at", { ascending: true });

  const { data: sessionDays } = await supabase
    .from("booking_session_days")
    .select("id, session_date, half_day, expected_participants, actual_participants")
    .eq("booking_request_id", id)
    .order("session_date", { ascending: true });

  const { data: travelCalc } = await supabase
    .from("travel_calculations")
    .select("*")
    .eq("booking_request_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: checklistItems } = await supabase
    .from("booking_checklist_items")
    .select("*")
    .eq("booking_request_id", id)
    .order("display_order", { ascending: true });

  if (!booking) {
    return <div className="p-6 text-sm text-neutral-500">Dossier introuvable.</div>;
  }

  return (
    <BookingDetailClient
      booking={booking as any}
      history={(history as any) ?? []}
      sessionDays={(sessionDays as any) ?? []}
      travelCalculation={travelCalc as any}
      checklistItems={(checklistItems as any) ?? []}
    />
  );
}

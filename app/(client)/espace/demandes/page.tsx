import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/booking-status";

export default async function ClientBookingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: bookings } = await supabase
    .from("booking_requests")
    .select("id, status, start_date, end_date, training_courses(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-medium mb-1">Mes demandes</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Suivi de toutes vos demandes de réservation, de l'envoi jusqu'à la
        réalisation de la formation.
      </p>

      <div className="space-y-2">
        {(bookings ?? []).map((b: any) => (
          <a
            key={b.id}
            href={`/espace/demandes/${b.id}`}
            className="flex items-center justify-between border rounded-md px-4 py-3 text-sm hover:border-neutral-400"
          >
            <div>
              <p className="font-medium">{b.training_courses?.title}</p>
              <p className="text-neutral-500 text-xs">
                {b.start_date} → {b.end_date}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[b.status]}`}>
              {STATUS_LABELS[b.status]}
            </span>
          </a>
        ))}
        {!bookings?.length && <p className="text-sm text-neutral-400">Aucune demande pour le moment.</p>}
      </div>
    </div>
  );
}

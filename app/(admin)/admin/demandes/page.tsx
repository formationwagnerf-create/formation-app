import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/booking-status";

export default async function AdminBookingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: bookings } = await supabase
    .from("booking_requests")
    .select("id, status, start_date, end_date, organizations(legal_name), training_courses(title)")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-xl font-medium mb-1">Demandes</h1>
      <p className="text-sm text-neutral-500 mb-6">Toutes les demandes, tous organismes confondus.</p>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-neutral-500 border-b">
            <th className="py-2 font-normal">Organisme</th>
            <th className="py-2 font-normal">Formation</th>
            <th className="py-2 font-normal">Dates</th>
            <th className="py-2 font-normal">Statut</th>
          </tr>
        </thead>
        <tbody>
          {(bookings ?? []).map((b: any) => (
            <tr key={b.id} className="border-b">
              <td className="py-2">
                <a href={`/admin/demandes/${b.id}`} className="font-medium">
                  {b.organizations?.legal_name}
                </a>
              </td>
              <td className="py-2">{b.training_courses?.title}</td>
              <td className="py-2 text-neutral-500">{b.start_date} → {b.end_date}</td>
              <td className="py-2">
                <span className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[b.status]}`}>
                  {STATUS_LABELS[b.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

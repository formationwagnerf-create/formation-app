import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  received: "Demande reçue",
  under_review: "En cours d'étude",
  option_proposed: "Option proposée",
  option_accepted: "Option acceptée",
  awaiting_client_confirmation: "En attente de votre confirmation",
  confirmed_by_client: "Confirmée par vous",
  confirmed_final: "Confirmée définitivement",
  scheduled: "Formation planifiée",
  completed: "Formation réalisée",
  cancelled_by_client: "Annulée par vous",
  cancelled_by_admin: "Annulée",
  refused: "Refusée",
  expired: "Expirée",
  archived: "Archivée",
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  draft: { color: "#6b7280", bg: "#f9fafb" },
  received: { color: "#1e40af", bg: "#dbeafe" },
  under_review: { color: "#1e40af", bg: "#dbeafe" },
  option_proposed: { color: "#92400e", bg: "#fef3c7" },
  awaiting_client_confirmation: { color: "#92400e", bg: "#fef3c7" },
  confirmed_final: { color: "#065f46", bg: "#d1fae5" },
  scheduled: { color: "#065f46", bg: "#d1fae5" },
  completed: { color: "#374151", bg: "#f3f4f6" },
  cancelled_by_client: { color: "#991b1b", bg: "#fee2e2" },
  cancelled_by_admin: { color: "#991b1b", bg: "#fee2e2" },
  refused: { color: "#991b1b", bg: "#fee2e2" },
};

export default async function ClientBookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: booking } = await supabase
    .from("booking_requests")
    .select("*, training_courses(title)")
    .eq("id", id)
    .single();

  if (!booking) redirect("/espace/demandes");

  const { data: history } = await supabase
    .from("booking_status_history")
    .select("old_status, new_status, comment, created_at")
    .eq("booking_request_id", id)
    .order("created_at", { ascending: true });

  const s = STATUS_COLORS[booking.status] ?? { color: "#374151", bg: "#f3f4f6" };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ background: "#fafafa", borderRight: "1px solid #e5e5e5", padding: "1.5rem 0" }}>
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Mon espace</p>
        </div>
        {[
          { href: "/espace", label: "Tableau de bord", icon: "📊" },
          { href: "/espace/demandes", label: "Mes demandes", icon: "📋" },
          { href: "/espace/demandes/nouvelle", label: "Nouvelle demande", icon: "➕" },
          { href: "/espace/formations", label: "Formations & tarifs", icon: "📚" },
          { href: "/espace/calendrier", label: "Calendrier", icon: "📅" },
          { href: "/espace/documents", label: "Documents", icon: "📁" },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 1.25rem", fontSize: "13px", color: "#333", textDecoration: "none" }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </a>
        ))}
      </aside>

      <main style={{ padding: "2rem", maxWidth: "700px" }}>
        <a href="/espace/demandes" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>← Mes demandes</a>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "1rem 0" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 600, margin: 0 }}>{(booking as any).training_courses?.title}</h1>
          <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: s.bg, color: s.color }}>
            {STATUS_LABELS[booking.status] ?? booking.status}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
          {[
            { label: "Date de début", value: booking.start_date ?? "—" },
            { label: "Date de fin", value: booking.end_date ?? "—" },
            { label: "Nombre de jours", value: booking.number_of_days ? `${booking.number_of_days} jour(s)` : "—" },
            { label: "Format", value: booking.day_format === "half_day" ? "Demi-journée" : "Journée entière" },
            { label: "Participants prévus", value: booking.expected_participants ?? "—" },
            { label: "Lieu", value: booking.venue_name ?? "—" },
            { label: "Adresse", value: booking.venue_address ?? "—" },
            { label: "Contact sur place", value: booking.on_site_contact_name ?? "—" },
          ].map((f) => (
            <div key={f.label} style={{ background: "#f9f9f9", borderRadius: "8px", padding: "0.75rem" }}>
              <p style={{ fontSize: "11px", color: "#888", margin: "0 0 4px" }}>{f.label}</p>
              <p style={{ fontSize: "14px", margin: 0 }}>{f.value}</p>
            </div>
          ))}
        </div>

        {booking.comment && (
          <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "1rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Commentaire</p>
            <p style={{ fontSize: "14px", margin: 0 }}>{booking.comment}</p>
          </div>
        )}

        {booking.applied_daily_price && (
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "1rem", marginBottom: "2rem" }}>
            <p style={{ fontSize: "12px", color: "#065f46", margin: "0 0 4px" }}>Tarif appliqué</p>
            <p style={{ fontSize: "16px", fontWeight: 600, margin: 0, color: "#065f46" }}>
              {booking.applied_daily_price} € HT / jour
            </p>
          </div>
        )}

        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e5e5" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Historique</h2>
          </div>
          <div style={{ padding: "1rem 1.25rem" }}>
            {(history ?? []).map((h: any, i: number) => (
              <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem", fontSize: "13px" }}>
                <span style={{ color: "#888", whiteSpace: "nowrap" }}>
                  {new Date(h.created_at).toLocaleDateString("fr-FR")}
                </span>
                <span>
                  {STATUS_LABELS[h.new_status] ?? h.new_status}
                  {h.comment && <span style={{ color: "#888" }}> — {h.comment}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

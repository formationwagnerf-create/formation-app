import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EspacePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id, first_name, last_name")
    .eq("id", user.id)
    .single();

  const { data: org } = profile?.organization_id
    ? await supabase.from("organizations").select("legal_name").eq("id", profile.organization_id).single()
    : { data: null };

  const { data: bookings } = await supabase
    .from("booking_requests")
    .select("id, status, start_date, end_date, training_courses(title)")
    .order("created_at", { ascending: false })
    .limit(5);

  const { count: totalBookings } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true });

  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    received: { label: "Reçue", color: "#92400e", bg: "#fef3c7" },
    under_review: { label: "En étude", color: "#1e40af", bg: "#dbeafe" },
    option_proposed: { label: "Option proposée", color: "#7c3aed", bg: "#ede9fe" },
    confirmed_final: { label: "Confirmée", color: "#065f46", bg: "#d1fae5" },
    scheduled: { label: "Planifiée", color: "#065f46", bg: "#d1fae5" },
    completed: { label: "Réalisée", color: "#374151", bg: "#f3f4f6" },
    cancelled_by_client: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
    draft: { label: "Brouillon", color: "#6b7280", bg: "#f9fafb" },
    awaiting_client_confirmation: { label: "À confirmer", color: "#92400e", bg: "#fef3c7" },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ background: "#fafafa", borderRight: "1px solid #e5e5e5", padding: "1.5rem 0" }}>
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Mon espace</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>{org?.legal_name ?? user.email}</p>
        </div>
        {[
          { href: "/espace", label: "Tableau de bord", icon: "📊" },
          { href: "/espace/demandes", label: "Mes demandes", icon: "📋" },
          { href: "/espace/demandes/nouvelle", label: "Nouvelle demande", icon: "➕" },
          { href: "/espace/formations", label: "Formations & tarifs", icon: "📚" },
          { href: "/espace/calendrier", label: "Calendrier", icon: "📅" },
          { href: "/espace/documents", label: "Documents", icon: "📁" },
          { href: "/mon-compte/utilisateurs", label: "Mon compte", icon: "👤" },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 1.25rem", fontSize: "13px", color: "#333", textDecoration: "none" }}>
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </a>
        ))}
        <div style={{ borderTop: "1px solid #e5e5e5", marginTop: "1rem", paddingTop: "1rem" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 1.25rem", fontSize: "13px", color: "#888", textDecoration: "none" }}>
            🌐 Voir le site
          </a>
        </div>
      </aside>

      {/* Main */}
      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 0.25rem" }}>
          Bonjour{profile?.first_name ? `, ${profile.first_name}` : ""} 👋
        </h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 2rem" }}>
          {org?.legal_name ?? "Votre espace de réservation de formations"}
        </p>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "1.25rem" }}>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 6px" }}>Total demandes</p>
            <p style={{ fontSize: "28px", fontWeight: 700, margin: 0 }}>{totalBookings ?? 0}</p>
          </div>
          <a href="/espace/demandes/nouvelle" style={{ textDecoration: "none", background: "#000", borderRadius: "10px", padding: "1.25rem", display: "block" }}>
            <p style={{ fontSize: "12px", color: "#ccc", margin: "0 0 6px" }}>Action rapide</p>
            <p style={{ fontSize: "15px", fontWeight: 600, margin: 0, color: "#fff" }}>Nouvelle demande →</p>
          </a>
          <a href="/espace/formations" style={{ textDecoration: "none", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "1.25rem", display: "block" }}>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 6px" }}>Catalogue</p>
            <p style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Voir les formations →</p>
          </a>
        </div>

        {/* Demandes récentes */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Mes dernières demandes</h2>
            <a href="/espace/demandes" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>Voir tout →</a>
          </div>
          {(bookings ?? []).length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ color: "#888", margin: "0 0 1rem", fontSize: "14px" }}>Vous n'avez pas encore fait de demande.</p>
              <a href="/espace/demandes/nouvelle" style={{ background: "#000", color: "#fff", padding: "8px 16px", borderRadius: "6px", textDecoration: "none", fontSize: "13px" }}>
                Faire une première demande
              </a>
            </div>
          ) : (
            <div style={{ padding: "0.5rem 0" }}>
              {(bookings ?? []).map((b: any) => {
                const s = statusLabels[b.status] ?? { label: b.status, color: "#374151", bg: "#f3f4f6" };
                return (
                  <a key={b.id} href={`/espace/demandes/${b.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 1.25rem", borderBottom: "1px solid #f0f0f0", textDecoration: "none", color: "inherit" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 500, fontSize: "14px" }}>{(b as any).training_courses?.title}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>{b.start_date ?? "Date à définir"}{b.end_date ? ` → ${b.end_date}` : ""}</p>
                    </div>
                    <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: s.bg, color: s.color, whiteSpace: "nowrap" }}>
                      {s.label}
                    </span>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/espace");

  const { count: pendingCount } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["received", "under_review"]);

  const { count: confirmedCount } = await supabase
    .from("booking_requests")
    .select("id", { count: "exact", head: true })
    .in("status", ["confirmed_final", "scheduled", "completed"]);

  const { count: coursesCount } = await supabase
    .from("training_courses")
    .select("id", { count: "exact", head: true })
    .eq("is_visible", true);

  const { data: recentBookings } = await supabase
    .from("booking_requests")
    .select("id, status, start_date, organizations(legal_name), training_courses(title)")
    .order("created_at", { ascending: false })
    .limit(8);

  const stats = [
    { label: "Demandes en attente", value: pendingCount ?? 0, color: "#f59e0b", href: "/admin/demandes" },
    { label: "Formations confirmées", value: confirmedCount ?? 0, color: "#10b981", href: "/admin/demandes" },
    { label: "Formations au catalogue", value: coursesCount ?? 0, color: "#3b82f6", href: "/admin/formations" },
  ];

  const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
    received: { label: "Reçue", color: "#92400e", bg: "#fef3c7" },
    under_review: { label: "En étude", color: "#1e40af", bg: "#dbeafe" },
    option_proposed: { label: "Option proposée", color: "#7c3aed", bg: "#ede9fe" },
    confirmed_final: { label: "Confirmée", color: "#065f46", bg: "#d1fae5" },
    scheduled: { label: "Planifiée", color: "#065f46", bg: "#d1fae5" },
    completed: { label: "Réalisée", color: "#374151", bg: "#f3f4f6" },
    cancelled_by_client: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
    cancelled_by_admin: { label: "Annulée", color: "#991b1b", bg: "#fee2e2" },
    refused: { label: "Refusée", color: "#991b1b", bg: "#fee2e2" },
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Sidebar */}
      <aside style={{ background: "#fafafa", borderRight: "1px solid #e5e5e5", padding: "1.5rem 0" }}>
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Administration</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#888" }}>François Wagner</p>
        </div>
        {[
          { href: "/admin", label: "Tableau de bord", icon: "📊" },
          { href: "/admin/demandes", label: "Demandes", icon: "📋" },
          { href: "/admin/formations", label: "Formations", icon: "📚" },
          { href: "/admin/documents-professionnels", label: "Documents", icon: "📁" },
          { href: "/admin/formations/nouvelle", label: "Ajouter formation", icon: "➕" },
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
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 2rem" }}>Tableau de bord</h1>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {stats.map((s) => (
            <a key={s.label} href={s.href} style={{ textDecoration: "none", background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", padding: "1.25rem", display: "block" }}>
              <p style={{ fontSize: "12px", color: "#888", margin: "0 0 6px" }}>{s.label}</p>
              <p style={{ fontSize: "28px", fontWeight: 700, margin: 0, color: s.color }}>{s.value}</p>
            </a>
          ))}
        </div>

        {/* Dernières demandes */}
        <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e5e5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Dernières demandes</h2>
            <a href="/admin/demandes" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>Voir tout →</a>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5", color: "#888" }}>
                <th style={{ padding: "10px 1.25rem", textAlign: "left", fontWeight: 400 }}>Organisme</th>
                <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>Formation</th>
                <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>Date</th>
                <th style={{ padding: "10px 1.25rem", textAlign: "left", fontWeight: 400 }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {(recentBookings ?? []).map((b: any) => {
                const s = statusLabels[b.status] ?? { label: b.status, color: "#374151", bg: "#f3f4f6" };
                return (
                  <tr key={b.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={{ padding: "10px 1.25rem" }}>
                      <a href={`/admin/demandes/${b.id}`} style={{ color: "#000", textDecoration: "none", fontWeight: 500 }}>
                        {b.organizations?.legal_name ?? "—"}
                      </a>
                    </td>
                    <td style={{ padding: "10px", color: "#555" }}>{b.training_courses?.title ?? "—"}</td>
                    <td style={{ padding: "10px", color: "#888" }}>{b.start_date ?? "—"}</td>
                    <td style={{ padding: "10px 1.25rem" }}>
                      <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "4px", background: s.bg, color: s.color }}>
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!recentBookings?.length && (
                <tr>
                  <td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#888" }}>
                    Aucune demande pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Administration</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>Tableau de bord administrateur.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <a href="/admin/demandes" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📋 Demandes</a>
        <a href="/admin/formations" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📚 Formations</a>
        <a href="/admin/documents-professionnels" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📁 Documents</a>
      </div>
    </div>
  );
}

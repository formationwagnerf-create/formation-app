import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function EspacePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Mon espace</h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>Bienvenue dans votre espace client.</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <a href="/espace/demandes" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📋 Mes demandes</a>
        <a href="/espace/formations" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📚 Formations</a>
        <a href="/espace/documents" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📁 Documents</a>
        <a href="/espace/calendrier" style={{ color: "#000", textDecoration: "none", padding: "0.75rem", border: "1px solid #e5e5e5", borderRadius: "6px" }}>📅 Calendrier</a>
      </div>
    </div>
  );
}

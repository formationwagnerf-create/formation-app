import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FormationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("training_courses")
    .select("id, title, short_description, duration_days, max_participants")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "960px", margin: "0 auto", padding: "2rem" }}>
      <a href="/" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>← Accueil</a>
      <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Formations en habilitation électrique</h1>
      <p style={{ fontSize: "14px", color: "#666", margin: "0 0 2rem" }}>
        Formations conformes à la norme NF C 18-510. Tarifs disponibles après création d'un compte organisme.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
        {(courses ?? []).map((c: any) => (
          <a key={c.id} href={`/formations/${c.id}`} style={{ textDecoration: "none", color: "inherit" }}>
            <div style={{ border: "1px solid #e5e5e5", borderRadius: "10px", padding: "1.25rem", transition: "border-color 0.2s" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 0.5rem" }}>{c.title}</h2>
              <p style={{ fontSize: "13px", color: "#666", margin: "0 0 1rem", lineHeight: 1.5 }}>{c.short_description}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", background: "#f0f0f0", borderRadius: "4px", padding: "3px 8px" }}>
                  {c.duration_days} jour{c.duration_days > 1 ? "s" : ""}
                </span>
                <span style={{ fontSize: "12px", background: "#f0f0f0", borderRadius: "4px", padding: "3px 8px" }}>
                  Max {c.max_participants} pers.
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      <div style={{ marginTop: "3rem", padding: "1.5rem", background: "#f9f9f9", borderRadius: "10px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 0.5rem" }}>Vous êtes un organisme de formation ?</h3>
        <p style={{ fontSize: "13px", color: "#666", margin: "0 0 1rem" }}>
          Créez un compte pour accéder aux tarifs, au calendrier et faire des demandes de réservation.
        </p>
        <a href="/creer-un-compte" style={{ background: "#000", color: "#fff", padding: "8px 16px", fontSize: "13px", borderRadius: "6px", textDecoration: "none" }}>
          Créer un compte organisme
        </a>
      </div>
    </div>
  );
}

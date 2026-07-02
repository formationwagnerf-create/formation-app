import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function FormationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: course } = await supabase
    .from("training_courses")
    .select("*")
    .eq("id", id)
    .eq("is_visible", true)
    .single();

  if (!course) {
    return (
      <div style={{ padding: "4rem 2rem", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <p style={{ color: "#666" }}>Formation introuvable.</p>
        <a href="/formations" style={{ color: "#000", fontSize: "14px" }}>← Retour au catalogue</a>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <a href="/formations" style={{ fontSize: "13px", color: "#666", textDecoration: "none", display: "block", marginBottom: "1.5rem" }}>
        ← Retour au catalogue
      </a>

      <h1 style={{ fontSize: "24px", fontWeight: 600, margin: "0 0 0.5rem" }}>{course.title}</h1>
      <p style={{ fontSize: "15px", color: "#555", margin: "0 0 2rem", lineHeight: 1.6 }}>{course.short_description}</p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "1rem" }}>
          <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Durée</p>
          <p style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>{course.duration_days} jour{course.duration_days > 1 ? "s" : ""}</p>
        </div>
        <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "1rem" }}>
          <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Participants max</p>
          <p style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>{course.max_participants} personnes</p>
        </div>
        {course.target_audience && (
          <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "1rem" }}>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Public concerné</p>
            <p style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>{course.target_audience}</p>
          </div>
        )}
        {course.prerequisites && (
          <div style={{ background: "#f9f9f9", borderRadius: "8px", padding: "1rem" }}>
            <p style={{ fontSize: "12px", color: "#888", margin: "0 0 4px" }}>Prérequis</p>
            <p style={{ fontSize: "15px", fontWeight: 500, margin: 0 }}>{course.prerequisites}</p>
          </div>
        )}
      </div>

      {course.full_description && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "0.5rem" }}>Description</h2>
          <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.7 }}>{course.full_description}</p>
        </div>
      )}

      {course.objectives && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "0.5rem" }}>Objectifs</h2>
          <p style={{ fontSize: "14px", color: "#555", lineHeight: 1.7 }}>{course.objectives}</p>
        </div>
      )}

      <div style={{ background: "#f0f0f0", borderRadius: "8px", padding: "1.25rem", marginTop: "2rem" }}>
        <p style={{ fontSize: "14px", color: "#555", margin: "0 0 1rem" }}>
          Les tarifs sont disponibles après création d'un compte organisme.
        </p>
        <div style={{ display: "flex", gap: "10px" }}>
          <a href="/creer-un-compte" style={{ background: "#000", color: "#fff", padding: "9px 16px", fontSize: "13px", borderRadius: "6px", textDecoration: "none" }}>
            Créer un compte
          </a>
          <a href="/connexion" style={{ padding: "9px 16px", fontSize: "13px", border: "1px solid #ccc", borderRadius: "6px", textDecoration: "none", color: "#000" }}>
            Se connecter
          </a>
        </div>
      </div>
    </div>
  );
}

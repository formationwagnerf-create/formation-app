export default function HomePage() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
        Plateforme de formations professionnelles
      </h1>
      <p style={{ color: "#666", marginBottom: "1.5rem" }}>
        Bienvenue sur votre plateforme de réservation.
      </p>
      <div style={{ display: "flex", gap: "1rem" }}>
        <a
          href="/connexion"
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ccc",
            borderRadius: "6px",
            textDecoration: "none",
            color: "#000",
          }}
        >
          Se connecter
        </a>
        <a
          href="/creer-un-compte"
          style={{
            padding: "0.5rem 1rem",
            background: "#000",
            color: "#fff",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          Créer un compte
        </a>
      </div>
    </main>
  );
}

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const showEmailMessage = searchParams.get("message") === "verifiez-votre-email";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setLoading(false);
      setError("Identifiants incorrects. Avez-vous confirmé votre email ?");
      return;
    }
    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
    if (profile?.role === "admin") {
      window.location.replace("/admin");
    } else {
      window.location.replace("/espace");
    }
  }

  const inputStyle = { width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "14px", boxSizing: "border-box" as const };

  return (
    <div style={{ maxWidth: "380px", margin: "4rem auto", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>← Accueil</a>
      <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "1rem 0 1.5rem" }}>Se connecter</h1>

      {showEmailMessage && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ margin: 0, fontSize: "14px", color: "#065f46" }}>
            ✅ Compte créé ! Vérifiez votre boîte mail et cliquez sur le lien de confirmation avant de vous connecter.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "13px", marginBottom: "4px" }}>Mot de passe</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "0.75rem" }}>
            <p style={{ margin: 0, fontSize: "13px", color: "#dc2626" }}>{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} style={{ background: "#000", color: "#fff", border: "none", borderRadius: "6px", padding: "0.75rem", fontSize: "14px", cursor: "pointer" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>

      <p style={{ fontSize: "13px", color: "#888", textAlign: "center", marginTop: "1.5rem" }}>
        Pas encore de compte ? <a href="/creer-un-compte" style={{ color: "#000" }}>Créer un compte organisme</a>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Chargement...</div>}>
      <LoginForm />
    </Suspense>
  );
}

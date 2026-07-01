"use client";

import { Suspense, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError || !data.user) {
      setLoading(false);
      setError("Identifiants incorrects.");
      return;
    }
    const { data: profile } = await supabase.from("users").select("role").eq("id", data.user.id).single();
    if (profile?.role === "admin") {
      window.location.replace("/admin");
    } else {
      window.location.replace("/espace");
    }
  }

  return (
    <div style={{ maxWidth: "360px", margin: "4rem auto", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.25rem", marginBottom: "1.5rem" }}>Se connecter</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>E-mail</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", boxSizing: "border-box" }} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem" }}>Mot de passe</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "0.875rem", boxSizing: "border-box" }} />
        </div>
        {error && <p style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</p>}
        <button type="submit" disabled={loading} style={{ background: "#000", color: "#fff", border: "none", borderRadius: "6px", padding: "0.625rem", fontSize: "0.875rem", cursor: "pointer" }}>
          {loading ? "Connexion..." : "Se connecter"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<div>Chargement...</div>}><LoginForm /></Suspense>;
}

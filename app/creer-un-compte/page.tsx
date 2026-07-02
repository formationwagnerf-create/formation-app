"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function CreateAccountPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});

  function set(key: string, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createSupabaseBrowserClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: { data: { first_name: values.contactFirstName, last_name: values.contactLastName } },
    });

    if (authError || !data.user) {
      setError(authError?.message ?? "Erreur lors de la création du compte");
      setLoading(false);
      return;
    }

    const { data: org, error: orgError } = await supabase.from("organizations").insert({
      legal_name: values.legalName,
      siret: values.siret || null,
      admin_address: values.adminAddress,
      billing_address: values.billingAddress || values.adminAddress,
      email: values.email,
      phone: values.phone,
      contact_first_name: values.contactFirstName,
      contact_last_name: values.contactLastName,
      contact_role: values.contactRole,
    }).select("id").single();

    if (orgError || !org) {
      setError("Erreur lors de la création de l'organisme");
      setLoading(false);
      return;
    }

    await supabase.from("users").update({
      organization_id: org.id,
      role: "org_admin",
      first_name: values.contactFirstName,
      last_name: values.contactLastName,
      phone: values.phone,
    }).eq("id", data.user.id);

    await supabase.from("organization_users").insert({
      organization_id: org.id,
      user_id: data.user.id,
      is_org_admin: true,
    });

    setLoading(false);
    router.push("/connexion?message=verifiez-votre-email");
  }

  const inputStyle = { width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "0.5rem 0.75rem", fontSize: "14px", boxSizing: "border-box" as const };
  const labelStyle = { display: "block" as const, fontSize: "13px", marginBottom: "4px", color: "#333" };

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto", padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <a href="/" style={{ fontSize: "13px", color: "#666", textDecoration: "none" }}>← Accueil</a>
      <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "1rem 0 0.5rem" }}>Créer un compte organisme</h1>
      <p style={{ fontSize: "14px", color: "#888", margin: "0 0 2rem" }}>
        Accédez aux tarifs, au calendrier et faites vos demandes de réservation.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={labelStyle}>Raison sociale *</label>
          <input required style={inputStyle} value={values.legalName ?? ""} onChange={(e) => set("legalName", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>SIRET</label>
          <input style={inputStyle} value={values.siret ?? ""} onChange={(e) => set("siret", e.target.value)} placeholder="14 chiffres" />
        </div>
        <div>
          <label style={labelStyle}>Adresse administrative *</label>
          <input required style={inputStyle} value={values.adminAddress ?? ""} onChange={(e) => set("adminAddress", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Adresse de facturation (si différente)</label>
          <input style={inputStyle} value={values.billingAddress ?? ""} onChange={(e) => set("billingAddress", e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>Prénom du responsable *</label>
            <input required style={inputStyle} value={values.contactFirstName ?? ""} onChange={(e) => set("contactFirstName", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Nom *</label>
            <input required style={inputStyle} value={values.contactLastName ?? ""} onChange={(e) => set("contactLastName", e.target.value)} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Fonction *</label>
          <input required style={inputStyle} value={values.contactRole ?? ""} onChange={(e) => set("contactRole", e.target.value)} placeholder="ex: Responsable formation" />
        </div>
        <div>
          <label style={labelStyle}>Téléphone *</label>
          <input required style={inputStyle} value={values.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>E-mail *</label>
          <input required type="email" style={inputStyle} value={values.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div>
          <label style={labelStyle}>Mot de passe * (8 caractères minimum)</label>
          <input required type="password" minLength={8} style={inputStyle} value={values.password ?? ""} onChange={(e) => set("password", e.target.value)} />
        </div>

        {error && <p style={{ color: "#dc2626", fontSize: "13px" }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ background: "#000", color: "#fff", border: "none", borderRadius: "6px", padding: "0.75rem", fontSize: "14px", cursor: "pointer", marginTop: "0.5rem" }}>
          {loading ? "Création en cours..." : "Créer mon compte"}
        </button>

        <p style={{ fontSize: "13px", color: "#888", textAlign: "center" }}>
          Déjà un compte ? <a href="/connexion" style={{ color: "#000" }}>Se connecter</a>
        </p>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const DAYS = ["Lun","Mar","Mer","Jeu","Ven","Sam","Dim"];

export default function CalendrierPage() {
  const router = useRouter();
  const [availability, setAvailability] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formValues, setFormValues] = useState<Record<string, any>>({ numberOfDays: 1, dayFormat: "full_day", expectedParticipants: 14 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/connexion"); return; }
      const toDate = new Date();
      toDate.setFullYear(toDate.getFullYear() + 2);
      const { data } = await supabase
        .from("calendar_public_view")
        .select("day, availability")
        .gte("day", new Date().toISOString().slice(0, 10))
        .lte("day", toDate.toISOString().slice(0, 10))
        .eq("half_day", "full");
      const map: Record<string, string> = {};
      for (const d of data ?? []) map[d.day] = d.availability;
      setAvailability(map);
      const { data: c } = await supabase.from("training_courses").select("id, title, duration_days").eq("is_visible", true).eq("is_bookable", true).order("display_order");
      setCourses(c ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function formatDate(y: number, m: number, d: number) {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }

  function handleDayClick(dateStr: string) {
    if (availability[dateStr] === "unavailable") return;
    if (new Date(dateStr) < today) return;
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(dateStr); setSelectedEnd(null);
    } else {
      if (dateStr < selectedStart) { setSelectedEnd(selectedStart); setSelectedStart(dateStr); }
      else { setSelectedEnd(dateStr); }
    }
  }

  function isInRange(dateStr: string) {
    if (!selectedStart || !selectedEnd) return false;
    return dateStr > selectedStart && dateStr < selectedEnd;
  }

  function handleOpenForm() {
    if (!selectedStart) return;
    setFormValues((v) => ({ ...v, startDate: selectedStart, endDate: selectedEnd ?? selectedStart }));
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSubmitting(true);
    const supabase = createSupabaseBrowserClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/connexion"); return; }
    const { data: profile } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!profile?.organization_id) { setError("Aucun organisme associé."); setSubmitting(false); return; }
    const { data: price } = await supabase.from("course_prices").select("daily_price").eq("course_id", formValues.courseId).eq("is_active", true).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    const { data: booking, error: bookingError } = await supabase.from("booking_requests").insert({
      organization_id: profile.organization_id, created_by: user.id, course_id: formValues.courseId,
      status: "received", start_date: formValues.startDate, end_date: formValues.endDate,
      number_of_days: formValues.numberOfDays, day_format: formValues.dayFormat,
      expected_participants: formValues.expectedParticipants, venue_name: formValues.venueName,
      venue_address: formValues.venueAddress, on_site_contact_name: formValues.contactName,
      on_site_contact_phone: formValues.contactPhone, comment: formValues.comment,
      applied_daily_price: price?.daily_price ?? null,
    }).select("id").single();
    if (bookingError || !booking) { setError("Erreur lors de l'envoi."); setSubmitting(false); return; }
    await supabase.from("booking_status_history").insert({ booking_request_id: booking.id, new_status: "received", changed_by: user.id, comment: "Demande créée via le calendrier" });
    router.push(`/espace/demandes/${booking.id}`);
  }

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = (() => { const d = new Date(year, month, 1).getDay(); return d === 0 ? 6 : d - 1; })();

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <aside style={{ background: "#fafafa", borderRight: "1px solid #e5e5e5", padding: "1.5rem 0" }}>
        <div style={{ padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #e5e5e5", marginBottom: "1rem" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Mon espace</p>
        </div>
        {[
          { href: "/espace", label: "Tableau de bord", icon: "📊" },
          { href: "/espace/demandes", label: "Mes demandes", icon: "📋" },
          { href: "/espace/demandes/nouvelle", label: "Nouvelle demande", icon: "➕" },
          { href: "/espace/formations", label: "Formations & tarifs", icon: "📚" },
          { href: "/espace/calendrier", label: "Calendrier", icon: "📅" },
          { href: "/espace/documents", label: "Documents", icon: "📁" },
        ].map((item) => (
          <a key={item.href} href={item.href} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 1.25rem", fontSize: "13px", color: item.href === "/espace/calendrier" ? "#000" : "#555", textDecoration: "none", fontWeight: item.href === "/espace/calendrier" ? 600 : 400 }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </a>
        ))}
      </aside>

      <main style={{ padding: "2rem" }}>
        <h1 style={{ fontSize: "22px", fontWeight: 600, margin: "0 0 0.25rem" }}>Calendrier des disponibilités</h1>
        <p style={{ fontSize: "14px", color: "#888", margin: "0 0 2rem" }}>Cliquez sur une date de début puis une date de fin, puis faites votre demande.</p>

        {loading ? <p style={{ color: "#888" }}>Chargement...</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "2rem", alignItems: "start" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <button onClick={() => setViewDate(new Date(year, month - 1))} style={{ background: "none", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>←</button>
                <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{MONTHS[month]} {year}</h2>
                <button onClick={() => setViewDate(new Date(year, month + 1))} style={{ background: "none", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 12px", cursor: "pointer" }}>→</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
                {DAYS.map((d) => <div key={d} style={{ textAlign: "center", fontSize: "12px", color: "#888", padding: "4px 0" }}>{d}</div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = formatDate(year, month, day);
                  const avail = availability[dateStr];
                  const isPast = new Date(dateStr) < today;
                  const isStart = dateStr === selectedStart;
                  const isEnd = dateStr === selectedEnd;
                  const inRange = isInRange(dateStr);
                  let bg = "#fff", color = "#333", border = "1px solid #e5e5e5", cursor = "pointer";
                  if (isPast) { bg = "#f9f9f9"; color = "#ccc"; cursor = "default"; border = "1px solid #f0f0f0"; }
                  else if (avail === "unavailable") { bg = "#fee2e2"; color = "#999"; cursor = "not-allowed"; border = "1px solid #fecaca"; }
                  else if (avail === "available") { bg = "#f0fdf4"; color = "#065f46"; border = "1px solid #bbf7d0"; }
                  if (inRange) { bg = "#dbeafe"; color = "#1e40af"; border = "1px solid #93c5fd"; }
                  if (isStart || isEnd) { bg = "#000"; color = "#fff"; border = "1px solid #000"; }
                  return (
                    <div key={day} onClick={() => !isPast && handleDayClick(dateStr)}
                      style={{ textAlign: "center", padding: "8px 4px", borderRadius: "6px", fontSize: "13px", fontWeight: (isStart || isEnd) ? 700 : 400, background: bg, color, border, cursor }}>
                      {day}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "12px" }}>
                <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#f0fdf4", border: "1px solid #bbf7d0", marginRight: "4px" }} />Disponible</span>
                <span><span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: "#fee2e2", border: "1px solid #fecaca", marginRight: "4px" }} />Indisponible</span>
              </div>
            </div>

            <div>
              {!showForm ? (
                <div style={{ background: "#f9f9f9", borderRadius: "12px", padding: "1.5rem" }}>
                  <h3 style={{ fontSize: "15px", fontWeight: 600, margin: "0 0 1rem" }}>Votre sélection</h3>
                  {selectedStart ? (
                    <>
                      <p style={{ fontSize: "13px", margin: "0 0 4px" }}><strong>Début :</strong> {new Date(selectedStart + "T12:00:00").toLocaleDateString("fr-FR")}</p>
                      {selectedEnd && <p style={{ fontSize: "13px", margin: "0 0 1rem" }}><strong>Fin :</strong> {new Date(selectedEnd + "T12:00:00").toLocaleDateString("fr-FR")}</p>}
                      <button onClick={handleOpenForm} style={{ width: "100%", background: "#000", color: "#fff", border: "none", borderRadius: "6px", padding: "10px", fontSize: "14px", cursor: "pointer", marginTop: "0.5rem" }}>
                        Faire une demande →
                      </button>
                    </>
                  ) : (
                    <p style={{ fontSize: "13px", color: "#888" }}>Cliquez sur une date disponible pour commencer.</p>
                  )}
                </div>
              ) : (
                <div style={{ background: "#fff", border: "1px solid #e5e5e5", borderRadius: "12px", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h3 style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>Demande</h3>
                    <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888" }}>×</button>
                  </div>
                  <p style={{ fontSize: "12px", color: "#666", margin: "0 0 1rem" }}>
                    📅 {new Date(formValues.startDate + "T12:00:00").toLocaleDateString("fr-FR")}
                    {formValues.endDate !== formValues.startDate && ` → ${new Date(formValues.endDate + "T12:00:00").toLocaleDateString("fr-FR")}`}
                  </p>
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {[
                      { label: "Formation *", field: "courseId", type: "select" },
                    ].map(() => (
                      <div key="formation">
                        <label style={{ display: "block", fontSize: "12px", marginBottom: "3px", color: "#555" }}>Formation *</label>
                        <select required value={formValues.courseId ?? ""} onChange={(e) => setFormValues((v) => ({ ...v, courseId: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 8px", fontSize: "13px" }}>
                          <option value="">Choisir...</option>
                          {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                      </div>
                    ))}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", marginBottom: "3px", color: "#555" }}>Nb jours *</label>
                        <input type="number" min={0.5} step={0.5} required value={formValues.numberOfDays}
                          onChange={(e) => setFormValues((v) => ({ ...v, numberOfDays: Number(e.target.value) }))}
                          style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 8px", fontSize: "13px" }} />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", marginBottom: "3px", color: "#555" }}>Participants *</label>
                        <input type="number" min={1} required value={formValues.expectedParticipants}
                          onChange={(e) => setFormValues((v) => ({ ...v, expectedParticipants: Number(e.target.value) }))}
                          style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 8px", fontSize: "13px" }} />
                      </div>
                    </div>
                    {[
                      { label: "Établissement *", key: "venueName", required: true },
                      { label: "Adresse *", key: "venueAddress", required: true },
                      { label: "Contact sur place", key: "contactName", required: false },
                      { label: "Tél. contact", key: "contactPhone", required: false },
                    ].map((f) => (
                      <div key={f.key}>
                        <label style={{ display: "block", fontSize: "12px", marginBottom: "3px", color: "#555" }}>{f.label}</label>
                        <input required={f.required} value={formValues[f.key] ?? ""} onChange={(e) => setFormValues((v) => ({ ...v, [f.key]: e.target.value }))}
                          style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 8px", fontSize: "13px" }} />
                      </div>
                    ))}
                    <div>
                      <label style={{ display: "block", fontSize: "12px", marginBottom: "3px", color: "#555" }}>Commentaire</label>
                      <textarea rows={2} value={formValues.comment ?? ""} onChange={(e) => setFormValues((v) => ({ ...v, comment: e.target.value }))}
                        style={{ width: "100%", border: "1px solid #e5e5e5", borderRadius: "6px", padding: "6px 8px", fontSize: "13px" }} />
                    </div>
                    {error && <p style={{ color: "#dc2626", fontSize: "12px", margin: 0 }}>{error}</p>}
                    <button type="submit" disabled={submitting}
                      style={{ background: "#000", color: "#fff", border: "none", borderRadius: "6px", padding: "10px", fontSize: "13px", cursor: "pointer" }}>
                      {submitting ? "Envoi..." : "Envoyer la demande"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

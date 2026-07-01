"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBookingRequest } from "@/lib/actions/bookings";

function NewBookingRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<Record<string, any>>({
    courseId: searchParams.get("formation") ?? "",
    numberOfDays: 1,
    dayFormat: "full_day",
    expectedParticipants: 14,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = await createBookingRequest(values as any);
      router.push(`/espace/demandes/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-medium mb-1">Faire une demande de réservation</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Cette demande n'est pas une réservation ferme : elle sera étudiée par l'administrateur.
      </p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Date de début</label>
            <input type="date" required value={values.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Date de fin</label>
            <input type="date" required value={values.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Nombre de jours</label>
            <input type="number" min={0.5} step={0.5} value={values.numberOfDays} onChange={(e) => set("numberOfDays", Number(e.target.value))} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Format</label>
            <select value={values.dayFormat} onChange={(e) => set("dayFormat", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm">
              <option value="full_day">Journée entière</option>
              <option value="half_day">Demi-journée</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Nombre de participants prévus</label>
          <input type="number" min={1} value={values.expectedParticipants} onChange={(e) => set("expectedParticipants", Number(e.target.value))} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Nom de l'établissement</label>
          <input required value={values.venueName ?? ""} onChange={(e) => set("venueName", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm mb-1">Adresse exacte de la formation</label>
          <input required value={values.venueAddress ?? ""} onChange={(e) => set("venueAddress", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Contact sur place</label>
            <input value={values.onSiteContactName ?? ""} onChange={(e) => set("onSiteContactName", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm mb-1">Téléphone du contact</label>
            <input value={values.onSiteContactPhone ?? ""} onChange={(e) => set("onSiteContactPhone", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">Commentaire</label>
          <textarea rows={3} value={values.comment ?? ""} onChange={(e) => set("comment", e.target.value)} className="w-full border rounded-md px-3 py-2 text-sm" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm">
          {loading ? "Envoi..." : "Envoyer la demande"}
        </button>
      </form>
    </div>
  );
}

export default function NewBookingRequestPage() {
  return (
    <Suspense fallback={<div className="p-6">Chargement...</div>}>
      <NewBookingRequestForm />
    </Suspense>
  );
}

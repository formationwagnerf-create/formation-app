"use client";

import { useState } from "react";
import { changeBookingStatus, setActualParticipants } from "@/lib/actions/bookings";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/booking-status";
import TravelBlock from "./travel-block";
import ChecklistBlock from "./checklist-block";

const NEXT_ACTIONS: Record<string, { status: string; label: string }[]> = {
  received: [
    { status: "under_review", label: "Passer en étude" },
    { status: "refused", label: "Refuser" },
  ],
  under_review: [
    { status: "option_proposed", label: "Proposer une option" },
    { status: "confirmed_final", label: "Confirmer directement" },
    { status: "refused", label: "Refuser" },
  ],
  option_proposed: [
    { status: "option_accepted", label: "Option acceptée par le client" },
    { status: "expired", label: "Marquer expirée" },
  ],
  option_accepted: [{ status: "confirmed_final", label: "Confirmer définitivement" }],
  confirmed_final: [
    { status: "scheduled", label: "Marquer planifiée" },
    { status: "cancelled_by_admin", label: "Annuler" },
  ],
  scheduled: [
    { status: "completed", label: "Marquer réalisée" },
    { status: "cancelled_by_admin", label: "Annuler" },
  ],
  completed: [{ status: "archived", label: "Archiver" }],
};

export default function BookingDetailClient({
  booking,
  history,
  sessionDays,
  travelCalculation,
  checklistItems,
}: {
  booking: any;
  history: any[];
  sessionDays: any[];
  travelCalculation: any | null;
  checklistItems: any[];
}) {
  const [days, setDays] = useState(sessionDays);
  const [status, setStatus] = useState(booking.status);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setError(null);
    setLoading(true);
    try {
      await changeBookingStatus(booking.id, newStatus);
      setStatus(newStatus);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleParticipantsChange(dayId: string, value: string) {
    const n = Number(value);
    setDays((prev) => prev.map((d) => (d.id === dayId ? { ...d, actual_participants: n } : d)));
    await setActualParticipants(dayId, n);
  }

  const actions = NEXT_ACTIONS[status] ?? [];

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-medium">{booking.training_courses?.title}</h1>
        <span className={`text-xs px-2 py-1 rounded-md ${STATUS_COLORS[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <p className="text-sm text-neutral-500 mb-6">{booking.organizations?.legal_name}</p>

      <div className="grid grid-cols-2 gap-4 text-sm mb-6 border rounded-lg p-4">
        <div>
          <p className="text-neutral-500 text-xs">Dates</p>
          <p>{booking.start_date} → {booking.end_date}</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">Lieu</p>
          <p>{booking.venue_name} — {booking.venue_address}</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">Contact sur place</p>
          <p>{booking.on_site_contact_name} · {booking.on_site_contact_phone}</p>
        </div>
        <div>
          <p className="text-neutral-500 text-xs">Tarif appliqué</p>
          <p>{booking.applied_daily_price ? `${booking.applied_daily_price} € HT / jour` : "Non défini"}</p>
        </div>
        {booking.comment && (
          <div className="col-span-2">
            <p className="text-neutral-500 text-xs">Commentaire client</p>
            <p>{booking.comment}</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <p className="text-sm font-medium mb-2">Actions</p>
        <div className="flex gap-2 flex-wrap">
          {actions.map((a) => (
            <button
              key={a.status}
              disabled={loading}
              onClick={() => handleStatusChange(a.status)}
              className="text-sm border rounded-md px-3 py-1.5 hover:border-neutral-400"
            >
              {a.label}
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
      </div>

      <TravelBlock bookingId={booking.id} initialCalculation={travelCalculation} />

      <ChecklistBlock bookingId={booking.id} initialItems={checklistItems} />

      <div className="mb-6">
        <p className="text-sm font-medium mb-2">
          Participants — saisie par jour ou demi-journée (saisie administrateur uniquement)
        </p>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-neutral-500 border-b">
              <th className="py-1.5 font-normal">Session</th>
              <th className="py-1.5 font-normal">Prévu</th>
              <th className="py-1.5 font-normal">Réel</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="py-1.5">
                  {d.session_date} — {d.half_day === "full" ? "journée" : d.half_day === "morning" ? "matin" : "après-midi"}
                </td>
                <td className="py-1.5 text-neutral-500">{d.expected_participants ?? "—"}</td>
                <td className="py-1.5">
                  <input
                    type="number"
                    min={0}
                    value={d.actual_participants ?? ""}
                    onChange={(e) => handleParticipantsChange(d.id, e.target.value)}
                    className="w-20 border rounded-md px-2 py-1 text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <p className="text-sm font-medium mb-2">Historique</p>
        <div className="space-y-1 text-xs text-neutral-500">
          {history.map((h, i) => (
            <p key={i}>
              {new Date(h.created_at).toLocaleString("fr-FR")} — {h.users?.first_name}{" "}
              {h.users?.last_name} : {STATUS_LABELS[h.old_status] ?? "—"} → {STATUS_LABELS[h.new_status]}
              {h.comment ? ` (${h.comment})` : ""}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

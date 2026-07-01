"use client";

import { useState } from "react";
import { computeTravelForBooking, overrideTravelForBooking } from "@/lib/actions/travel";

export default function TravelBlock({
  bookingId,
  initialCalculation,
}: {
  bookingId: string;
  initialCalculation: any | null;
}) {
  const [calc, setCalc] = useState(initialCalculation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [manual, setManual] = useState({
    distanceOneWayKm: initialCalculation?.distance_one_way_km ?? "",
    finalAmount: initialCalculation?.final_amount ?? "",
  });

  async function handleCompute() {
    setError(null);
    setLoading(true);
    try {
      const result = await computeTravelForBooking(bookingId);
      setCalc({
        distance_one_way_km: result.totalDistanceKm / 2,
        billable_distance_km: result.billableDistanceKm,
        final_amount: result.amount,
        manual_override: false,
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleOverride() {
    setError(null);
    setLoading(true);
    try {
      await overrideTravelForBooking(bookingId, {
        distanceOneWayKm: manual.distanceOneWayKm ? Number(manual.distanceOneWayKm) : undefined,
        finalAmount: manual.finalAmount ? Number(manual.finalAmount) : undefined,
      });
      setCalc({
        distance_one_way_km: Number(manual.distanceOneWayKm) || calc?.distance_one_way_km,
        final_amount: Number(manual.finalAmount) || calc?.final_amount,
        manual_override: true,
      });
      setEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6 border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium">Frais de déplacement</p>
        {!editing && (
          <div className="flex gap-2">
            <button onClick={handleCompute} disabled={loading} className="text-xs border rounded-md px-2 py-1">
              {loading ? "Calcul..." : "Calculer automatiquement"}
            </button>
            <button onClick={() => setEditing(true)} className="text-xs text-neutral-500">
              Modifier manuellement
            </button>
          </div>
        )}
      </div>

      {calc && !editing && (
        <div className="text-sm space-y-0.5">
          <p>Distance aller : {calc.distance_one_way_km} km</p>
          <p>Distance facturable : {calc.billable_distance_km ?? "—"} km</p>
          <p className="font-medium">
            Montant estimé : {calc.final_amount} € HT{" "}
            {calc.manual_override && <span className="text-xs text-amber-600">(modifié manuellement)</span>}
          </p>
          <p className="text-xs text-neutral-400 mt-1">
            Frais de déplacement estimés, sous réserve de validation définitive.
          </p>
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs mb-1">Distance aller (km)</label>
              <input
                type="number"
                value={manual.distanceOneWayKm}
                onChange={(e) => setManual((m) => ({ ...m, distanceOneWayKm: e.target.value }))}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs mb-1">Montant final (€ HT)</label>
              <input
                type="number"
                value={manual.finalAmount}
                onChange={(e) => setManual((m) => ({ ...m, finalAmount: e.target.value }))}
                className="w-full border rounded-md px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleOverride} disabled={loading} className="text-xs bg-neutral-900 text-white rounded-md px-3 py-1.5">
              Enregistrer
            </button>
            <button onClick={() => setEditing(false)} className="text-xs text-neutral-500">
              Annuler
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {!calc && !editing && <p className="text-xs text-neutral-400">Pas encore calculé.</p>}
    </div>
  );
}

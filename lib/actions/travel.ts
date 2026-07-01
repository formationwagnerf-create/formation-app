"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRoadDistanceKm } from "@/lib/google-maps";
import { calculateTravelCost } from "@/lib/travel";

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Réservé à l'administrateur");
  return supabase;
}

/**
 * Calcule et enregistre les frais de déplacement pour un dossier, en
 * utilisant les paramètres actuellement actifs (franchise, tarif/km,
 * règle de calcul). Le résultat est ensuite figé sur le dossier : un
 * changement ultérieur des paramètres globaux ne modifiera jamais ce
 * calcul déjà enregistré (cahier des charges §10).
 */
export async function computeTravelForBooking(bookingId: string) {
  const supabase = await assertAdmin();

  const { data: booking } = await supabase
    .from("booking_requests")
    .select("venue_address")
    .eq("id", bookingId)
    .single();
  if (!booking?.venue_address) throw new Error("Adresse du lieu manquante sur le dossier");

  const { data: settings } = await supabase
    .from("travel_settings")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!settings) throw new Error("Aucun paramètre de déplacement actif");

  const distanceOneWayKm = await getRoadDistanceKm(settings.origin_address, booking.venue_address);

  const result = calculateTravelCost({
    distanceOneWayKm,
    numberOfTrips: 2,
    settings: {
      originAddress: settings.origin_address,
      freeKmThreshold: settings.free_km_threshold,
      pricePerKm: settings.price_per_km,
      franchiseRule: settings.franchise_rule,
    },
  });

  const { error } = await supabase.from("travel_calculations").insert({
    booking_request_id: bookingId,
    origin_address: settings.origin_address,
    destination_address: booking.venue_address,
    distance_one_way_km: distanceOneWayKm,
    number_of_trips: 2,
    total_distance_km: result.totalDistanceKm,
    free_km_threshold: settings.free_km_threshold,
    billable_distance_km: result.billableDistanceKm,
    price_per_km: settings.price_per_km,
    computed_amount: result.amount,
    final_amount: result.amount,
    manual_override: false,
  });
  if (error) throw new Error(error.message);

  return result;
}

/**
 * Permet à l'administrateur de surcharger manuellement n'importe quelle
 * composante du calcul (kilométrage, franchise, tarif, montant final),
 * comme prévu au §10 — toujours sur le dossier, jamais sur les paramètres
 * globaux.
 */
export async function overrideTravelForBooking(
  bookingId: string,
  overrides: Partial<{
    distanceOneWayKm: number;
    numberOfTrips: number;
    freeKmThreshold: number;
    pricePerKm: number;
    finalAmount: number;
  }>
) {
  const supabase = await assertAdmin();

  const { data: existing } = await supabase
    .from("travel_calculations")
    .select("*")
    .eq("booking_request_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const distanceOneWayKm = overrides.distanceOneWayKm ?? existing?.distance_one_way_km ?? 0;
  const numberOfTrips = overrides.numberOfTrips ?? existing?.number_of_trips ?? 2;
  const freeKmThreshold = overrides.freeKmThreshold ?? existing?.free_km_threshold ?? 0;
  const pricePerKm = overrides.pricePerKm ?? existing?.price_per_km ?? 0;

  const totalDistanceKm = distanceOneWayKm * numberOfTrips;
  const billableDistanceKm = Math.max(0, totalDistanceKm - freeKmThreshold);
  const computedAmount = Math.round(billableDistanceKm * pricePerKm * 100) / 100;
  const finalAmount = overrides.finalAmount ?? computedAmount;

  const { error } = await supabase.from("travel_calculations").insert({
    booking_request_id: bookingId,
    origin_address: existing?.origin_address ?? "",
    destination_address: existing?.destination_address ?? "",
    distance_one_way_km: distanceOneWayKm,
    number_of_trips: numberOfTrips,
    total_distance_km: totalDistanceKm,
    free_km_threshold: freeKmThreshold,
    billable_distance_km: billableDistanceKm,
    price_per_km: pricePerKm,
    computed_amount: computedAmount,
    final_amount: finalAmount,
    manual_override: true,
  });
  if (error) throw new Error(error.message);
}

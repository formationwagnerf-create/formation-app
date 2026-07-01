export type FranchiseRule = "one_way" | "round_trip" | "per_trip" | "whole_mission";

export type TravelSettings = {
  originAddress: string;
  freeKmThreshold: number;
  pricePerKm: number;
  franchiseRule: FranchiseRule;
};

export type TravelCalculationInput = {
  distanceOneWayKm: number;
  numberOfTrips: number; // généralement 2 (aller + retour)
  settings: TravelSettings;
};

export type TravelCalculationResult = {
  totalDistanceKm: number;
  billableDistanceKm: number;
  amount: number;
};

/**
 * Calcule le montant des frais kilométriques selon la règle de franchise
 * choisie par l'administrateur. Le résultat est toujours présenté comme
 * une estimation côté client.
 *
 * Important : ce calcul ne doit JAMAIS être ré-exécuté automatiquement sur
 * un dossier déjà créé. Au moment de la création de la demande, le résultat
 * doit être copié (snapshot) dans la table travel_calculations, pour qu'une
 * modification future des paramètres (franchise, tarif/km) ne change jamais
 * rétroactivement un ancien dossier.
 */
export function calculateTravelCost(input: TravelCalculationInput): TravelCalculationResult {
  const { distanceOneWayKm, numberOfTrips, settings } = input;
  const totalDistanceKm = distanceOneWayKm * numberOfTrips;

  let billableDistanceKm: number;

  switch (settings.franchiseRule) {
    case "one_way":
      // la franchise ne s'applique qu'une fois, sur l'aller simple
      billableDistanceKm =
        totalDistanceKm - Math.min(settings.freeKmThreshold, distanceOneWayKm);
      break;
    case "per_trip":
      // la franchise s'applique sur chaque trajet individuellement
      billableDistanceKm =
        Math.max(0, distanceOneWayKm - settings.freeKmThreshold) * numberOfTrips;
      break;
    case "whole_mission":
      // une seule franchise globale, déduite de la distance totale
      billableDistanceKm = totalDistanceKm - settings.freeKmThreshold;
      break;
    case "round_trip":
    default:
      // la franchise est déduite une fois de la distance aller-retour
      billableDistanceKm = totalDistanceKm - settings.freeKmThreshold;
      break;
  }

  billableDistanceKm = Math.max(0, Math.round(billableDistanceKm * 100) / 100);
  const amount = Math.round(billableDistanceKm * settings.pricePerKm * 100) / 100;

  return { totalDistanceKm, billableDistanceKm, amount };
}

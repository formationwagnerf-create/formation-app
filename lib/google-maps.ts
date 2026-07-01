/**
 * Calcule la distance ROUTIÈRE (jamais à vol d'oiseau, cahier des charges
 * §10) entre l'adresse de départ et le lieu de la formation, via l'API
 * Google Maps Routes.
 */
export async function getRoadDistanceKm(
  originAddress: string,
  destinationAddress: string
): Promise<number> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY manquant : configurez-le dans les variables d'environnement");
  }

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: destinationAddress },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Échec du calcul de distance (${response.status})`);
  }

  const data = await response.json();
  const meters = data.routes?.[0]?.distanceMeters;
  if (typeof meters !== "number") {
    throw new Error("Impossible de déterminer la distance pour cette adresse");
  }

  return Math.round((meters / 1000) * 10) / 10;
}

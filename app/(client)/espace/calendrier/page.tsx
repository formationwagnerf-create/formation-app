import { getClientAvailability } from "@/lib/calendar";
import { addYears, format } from "date-fns";

// Page "Réserver" côté client : montre la disponibilité sur toute la
// fenêtre glissante de 2 ans configurée par l'administrateur. Le client
// peut donc réserver dès aujourd'hui une date qui sera, dans 18 mois,
// encore à l'intérieur de cette fenêtre de 2 ans à ce moment-là — car
// la fenêtre avance chaque jour (voir lib/calendar.ts).
export default async function ClientCalendarPage() {
  const today = new Date();
  const horizon = addYears(today, 2);

  const availability = await getClientAvailability(
    format(today, "yyyy-MM-dd"),
    format(horizon, "yyyy-MM-dd")
  );

  const byMonth = availability.reduce<Record<string, typeof availability>>((acc, d) => {
    const key = d.day.slice(0, 7); // "2026-07"
    acc[key] = acc[key] || [];
    acc[key].push(d);
    return acc;
  }, {});

  return (
    <div className="p-6">
      <h1 className="text-xl font-medium mb-1">Disponibilités</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Vous pouvez réserver jusqu'à 2 ans à l'avance. Cette fenêtre avance
        automatiquement chaque jour : il n'y a jamais de date limite figée.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(byMonth)
          .slice(0, 24)
          .map(([month, days]) => (
            <div key={month} className="border rounded-lg p-3">
              <p className="text-sm font-medium mb-2">{month}</p>
              <div className="grid grid-cols-7 gap-1 text-xs">
                {days
                  .filter((d) => d.half_day === "full")
                  .map((d) => (
                    <span
                      key={d.day}
                      title={d.availability === "available" ? "Disponible" : "Indisponible"}
                      className={
                        "block w-6 h-6 rounded-full flex items-center justify-center " +
                        (d.availability === "available"
                          ? "bg-green-100 text-green-700"
                          : "bg-neutral-100 text-neutral-400")
                      }
                    >
                      {d.day.slice(8, 10)}
                    </span>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

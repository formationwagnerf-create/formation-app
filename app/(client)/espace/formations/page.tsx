import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolvePriceForOrganization } from "@/lib/pricing";
import { redirect } from "next/navigation";

export default async function ClientCataloguePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");

  const { data: profile } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();
  if (!profile?.organization_id) redirect("/espace");

  const { data: courses } = await supabase
    .from("training_courses")
    .select("id, title, short_description, duration_days, max_participants, is_bookable")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  const coursesWithPrices = await Promise.all(
    (courses ?? []).map(async (c) => ({
      ...c,
      price: await resolvePriceForOrganization(c.id, profile.organization_id!),
    }))
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-medium mb-1">Formations</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Tarifs applicables à votre organisme. Une demande de réservation ne
        constitue pas une réservation ferme : elle sera étudiée par
        l'administrateur.
      </p>

      <div className="grid grid-cols-2 gap-4">
        {coursesWithPrices.map((c) => (
          <div key={c.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-1">
              <p className="text-sm font-medium">{c.title}</p>
              {c.price && (
                <span className="text-sm font-medium whitespace-nowrap ml-2">
                  {c.price.dailyPrice.toLocaleString("fr-FR")} € HT / jour
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mb-3">{c.short_description}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-neutral-400">
                {c.duration_days} jour{c.duration_days > 1 ? "s" : ""} · max {c.max_participants}{" "}
                participants
              </p>
              {c.is_bookable ? (
                <a
                  href={`/espace/demandes/nouvelle?formation=${c.id}`}
                  className="text-xs bg-neutral-900 text-white rounded-md px-3 py-1.5"
                >
                  Demander
                </a>
              ) : (
                <span className="text-xs text-neutral-400">Sur devis uniquement</span>
              )}
            </div>
            {!c.price && (
              <p className="text-xs text-amber-600 mt-2">
                Tarif non encore défini pour cette formation — contactez-nous.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

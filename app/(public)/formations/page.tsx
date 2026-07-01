import { createSupabaseServerClient } from "@/lib/supabase/server";

// Catalogue visible par tout visiteur, même non connecté. Les tarifs ne
// sont jamais affichés ici (cahier des charges §3) : il faut créer un
// compte pour les voir, sur la page équivalente côté espace client.
export default async function PublicCataloguePage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("training_courses")
    .select("id, title, short_description, duration_days, target_audience, image_url")
    .eq("is_visible", true)
    .order("display_order", { ascending: true });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-xl font-medium mb-1">Nos formations</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Créez un compte organisme pour consulter les tarifs et faire une
        demande de réservation.
      </p>

      <div className="grid grid-cols-3 gap-4">
        {(courses ?? []).map((c) => (
          <a
            key={c.id}
            href={`/formations/${c.id}`}
            className="border rounded-lg p-4 hover:border-neutral-400 transition-colors"
          >
            <p className="text-sm font-medium mb-1">{c.title}</p>
            <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{c.short_description}</p>
            <p className="text-xs text-neutral-400">
              {c.duration_days} jour{c.duration_days > 1 ? "s" : ""} · {c.target_audience}
            </p>
          </a>
        ))}
      </div>

      {!courses?.length && (
        <p className="text-sm text-neutral-400">Aucune formation publiée pour le moment.</p>
      )}
    </div>
  );
}

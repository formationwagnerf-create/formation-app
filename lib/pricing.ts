import { createSupabaseServerClient } from "./supabase/server";

export type ResolvedPrice = {
  dailyPrice: number;
  halfDayPrice: number | null;
  source: "organization_specific" | "general";
  comment: string | null;
};

/**
 * Résout le tarif applicable pour une formation donnée, pour un organisme
 * donné, en respectant la hiérarchie décrite au §5 du cahier des charges :
 *
 *   1. Tarif général par défaut (course_prices)
 *   2. Tarif spécifique à l'organisme (organization_prices), s'il existe
 *      et est actif → il prime sur le tarif général
 *   3. Tarif exceptionnel : ne passe pas par cette fonction — il est saisi
 *      manuellement par l'administrateur directement sur la demande de
 *      réservation (booking_requests.applied_daily_price), et c'est cette
 *      valeur-là qui est définitive pour ce dossier.
 *
 * Important : cette fonction sert à PROPOSER un tarif au moment de la
 * création d'une demande. Une fois la demande créée, le tarif est copié
 * (snapshot) sur la ligne booking_requests et ne doit plus jamais être
 * recalculé automatiquement, même si le tarif général ou spécifique change
 * ensuite (cahier des charges §5 : "une modification future d'un tarif ne
 * doit jamais modifier rétroactivement une ancienne réservation").
 */
export async function resolvePriceForOrganization(
  courseId: string,
  organizationId: string
): Promise<ResolvedPrice | null> {
  const supabase = await createSupabaseServerClient();

  const { data: specific } = await supabase
    .from("organization_prices")
    .select("daily_price, half_day_price, comment")
    .eq("course_id", courseId)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (specific) {
    return {
      dailyPrice: specific.daily_price,
      halfDayPrice: specific.half_day_price,
      source: "organization_specific",
      comment: specific.comment,
    };
  }

  const { data: general } = await supabase
    .from("course_prices")
    .select("daily_price, half_day_price, comment")
    .eq("course_id", courseId)
    .eq("is_active", true)
    .lte("effective_from", new Date().toISOString().slice(0, 10))
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (general) {
    return {
      dailyPrice: general.daily_price,
      halfDayPrice: general.half_day_price,
      source: "general",
      comment: general.comment,
    };
  }

  return null;
}

"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CourseInput = {
  title: string;
  shortDescription?: string;
  fullDescription?: string;
  objectives?: string;
  prerequisites?: string;
  targetAudience?: string;
  programPdfUrl?: string;
  durationDays: number;
  maxParticipants?: number;
  isCustomizable?: boolean;
  defaultDailyPrice?: number;
  defaultHalfDayPrice?: number;
  isVisible?: boolean;
  isBookable?: boolean;
  imageUrl?: string;
};

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté");

  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new Error("Action réservée à l'administrateur");

  return supabase;
}

export async function createCourse(input: CourseInput) {
  const supabase = await assertAdmin();

  const { data, error } = await supabase
    .from("training_courses")
    .insert({
      title: input.title,
      short_description: input.shortDescription,
      full_description: input.fullDescription,
      objectives: input.objectives,
      prerequisites: input.prerequisites,
      target_audience: input.targetAudience,
      program_pdf_url: input.programPdfUrl,
      duration_days: input.durationDays,
      max_participants: input.maxParticipants ?? 14,
      is_customizable: input.isCustomizable ?? false,
      default_daily_price: input.defaultDailyPrice,
      default_half_day_price: input.defaultHalfDayPrice,
      is_visible: input.isVisible ?? true,
      is_bookable: input.isBookable ?? true,
      image_url: input.imageUrl,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Le tarif par défaut saisi sur la fiche crée aussi la première ligne
  // de tarif général, pour que la formation ait immédiatement un prix
  // visible côté client.
  if (input.defaultDailyPrice) {
    await supabase.from("course_prices").insert({
      course_id: data.id,
      daily_price: input.defaultDailyPrice,
      half_day_price: input.defaultHalfDayPrice ?? null,
    });
  }

  return data.id as string;
}

export async function updateCourse(courseId: string, input: Partial<CourseInput>) {
  const supabase = await assertAdmin();

  const { error } = await supabase
    .from("training_courses")
    .update({
      title: input.title,
      short_description: input.shortDescription,
      full_description: input.fullDescription,
      objectives: input.objectives,
      prerequisites: input.prerequisites,
      target_audience: input.targetAudience,
      program_pdf_url: input.programPdfUrl,
      duration_days: input.durationDays,
      max_participants: input.maxParticipants,
      is_customizable: input.isCustomizable,
      is_visible: input.isVisible,
      is_bookable: input.isBookable,
      image_url: input.imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", courseId);

  if (error) throw new Error(error.message);
}

export async function setCourseVisibility(courseId: string, isVisible: boolean) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("training_courses")
    .update({ is_visible: isVisible })
    .eq("id", courseId);
  if (error) throw new Error(error.message);
}

// Suppression logique uniquement : on ne perd jamais l'historique des
// anciens dossiers qui référencent cette formation.
export async function deleteCourse(courseId: string) {
  const supabase = await assertAdmin();
  const { error } = await supabase
    .from("training_courses")
    .update({ deleted_at: new Date().toISOString(), is_visible: false, is_bookable: false })
    .eq("id", courseId);
  if (error) throw new Error(error.message);
}

export async function duplicateCourse(courseId: string) {
  const supabase = await assertAdmin();

  const { data: original, error: fetchError } = await supabase
    .from("training_courses")
    .select("*")
    .eq("id", courseId)
    .single();

  if (fetchError || !original) throw new Error("Formation introuvable");

  const { id, created_at, updated_at, deleted_at, ...rest } = original;

  const { data: copy, error } = await supabase
    .from("training_courses")
    .insert({ ...rest, title: `${original.title} (copie)`, is_visible: false })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return copy.id as string;
}

export async function reorderCourses(orderedIds: string[]) {
  const supabase = await assertAdmin();

  await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("training_courses").update({ display_order: index }).eq("id", id)
    )
  );
}

// ---- Tarifs ----

export async function setGeneralPrice(
  courseId: string,
  dailyPrice: number,
  halfDayPrice: number | null,
  comment?: string
) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("course_prices").insert({
    course_id: courseId,
    daily_price: dailyPrice,
    half_day_price: halfDayPrice,
    comment,
  });
  if (error) throw new Error(error.message);
}

export async function setOrganizationPrice(
  courseId: string,
  organizationId: string,
  dailyPrice: number,
  halfDayPrice: number | null,
  comment?: string
) {
  const supabase = await assertAdmin();
  const { error } = await supabase.from("organization_prices").insert({
    course_id: courseId,
    organization_id: organizationId,
    daily_price: dailyPrice,
    half_day_price: halfDayPrice,
    comment,
  });
  if (error) throw new Error(error.message);
}

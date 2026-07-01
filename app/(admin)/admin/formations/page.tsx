import { createSupabaseServerClient } from "@/lib/supabase/server";
import CoursesListClient from "./courses-list-client";

export default async function AdminCoursesPage() {
  const supabase = await createSupabaseServerClient();
  const { data: courses } = await supabase
    .from("training_courses")
    .select("id, title, duration_days, max_participants, is_visible, is_bookable, display_order, default_daily_price")
    .is("deleted_at", null)
    .order("display_order", { ascending: true });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-medium">Formations</h1>
        <a href="/admin/formations/nouvelle" className="text-sm bg-neutral-900 text-white rounded-md px-3 py-1.5">
          + Ajouter une formation
        </a>
      </div>
      <p className="text-sm text-neutral-500 mb-6">
        Gérez le catalogue, la visibilité et la possibilité de réserver pour
        chaque formation.
      </p>

      <CoursesListClient initialCourses={courses ?? []} />
    </div>
  );
}

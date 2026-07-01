"use client";

import { useState } from "react";
import { setCourseVisibility, deleteCourse, duplicateCourse } from "@/lib/actions/courses";

type Course = {
  id: string;
  title: string;
  duration_days: number;
  max_participants: number;
  is_visible: boolean;
  is_bookable: boolean;
  default_daily_price: number | null;
};

export default function CoursesListClient({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState(initialCourses);

  async function toggleVisibility(course: Course) {
    await setCourseVisibility(course.id, !course.is_visible);
    setCourses((prev) =>
      prev.map((c) => (c.id === course.id ? { ...c, is_visible: !c.is_visible } : c))
    );
  }

  async function handleDuplicate(courseId: string) {
    const newId = await duplicateCourse(courseId);
    window.location.href = `/admin/formations/${newId}`;
  }

  async function handleDelete(courseId: string) {
    if (!confirm("Désactiver et supprimer cette formation du catalogue actif ?")) return;
    await deleteCourse(courseId);
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  }

  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr className="text-left text-neutral-500 border-b">
          <th className="py-2 font-normal">Formation</th>
          <th className="py-2 font-normal">Durée</th>
          <th className="py-2 font-normal">Max participants</th>
          <th className="py-2 font-normal">Tarif/jour</th>
          <th className="py-2 font-normal">Visible</th>
          <th className="py-2 font-normal">Réservable</th>
          <th className="py-2 font-normal"></th>
        </tr>
      </thead>
      <tbody>
        {courses.map((c) => (
          <tr key={c.id} className="border-b">
            <td className="py-2">
              <a href={`/admin/formations/${c.id}`} className="font-medium">
                {c.title}
              </a>
            </td>
            <td className="py-2">{c.duration_days} j</td>
            <td className="py-2">{c.max_participants}</td>
            <td className="py-2">
              {c.default_daily_price ? `${c.default_daily_price} € HT` : "—"}
            </td>
            <td className="py-2">
              <button onClick={() => toggleVisibility(c)} className="underline">
                {c.is_visible ? "Visible" : "Masquée"}
              </button>
            </td>
            <td className="py-2">{c.is_bookable ? "Oui" : "Non"}</td>
            <td className="py-2 text-right space-x-3">
              <button onClick={() => handleDuplicate(c.id)} className="text-neutral-500">
                Dupliquer
              </button>
              <button onClick={() => handleDelete(c.id)} className="text-red-600">
                Supprimer
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

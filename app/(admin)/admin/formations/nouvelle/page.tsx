"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";

export default function NewCoursePage() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, any>>({
    durationDays: 1,
    maxParticipants: 14,
    isCustomizable: false,
    isVisible: true,
    isBookable: true,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(key: string, value: any) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const id = await createCourse(values as any);
      router.push(`/admin/formations/${id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-medium mb-6">Ajouter une formation</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">Titre</label>
          <input
            required
            value={values.title ?? ""}
            onChange={(e) => set("title", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description courte</label>
          <input
            value={values.shortDescription ?? ""}
            onChange={(e) => set("shortDescription", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Description complète</label>
          <textarea
            rows={4}
            value={values.fullDescription ?? ""}
            onChange={(e) => set("fullDescription", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Objectifs</label>
            <textarea
              rows={3}
              value={values.objectives ?? ""}
              onChange={(e) => set("objectives", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Prérequis</label>
            <textarea
              rows={3}
              value={values.prerequisites ?? ""}
              onChange={(e) => set("prerequisites", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Public concerné</label>
          <input
            value={values.targetAudience ?? ""}
            onChange={(e) => set("targetAudience", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Nombre de jours (1 à 5)</label>
            <input
              type="number"
              min={1}
              max={5}
              required
              value={values.durationDays}
              onChange={(e) => set("durationDays", Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Nombre maximal de participants</label>
            <input
              type="number"
              min={1}
              value={values.maxParticipants}
              onChange={(e) => set("maxParticipants", Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Tarif journée (€ HT)</label>
            <input
              type="number"
              step="0.01"
              value={values.defaultDailyPrice ?? ""}
              onChange={(e) => set("defaultDailyPrice", Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Tarif demi-journée (€ HT)</label>
            <input
              type="number"
              step="0.01"
              value={values.defaultHalfDayPrice ?? ""}
              onChange={(e) => set("defaultHalfDayPrice", Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Lien vers le programme PDF</label>
          <input
            value={values.programPdfUrl ?? ""}
            onChange={(e) => set("programPdfUrl", e.target.value)}
            className="w-full border rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex gap-6 text-sm pt-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.isCustomizable}
              onChange={(e) => set("isCustomizable", e.target.checked)}
            />
            Personnalisable
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.isVisible}
              onChange={(e) => set("isVisible", e.target.checked)}
            />
            Visible sur le site
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={values.isBookable}
              onChange={(e) => set("isBookable", e.target.checked)}
            />
            Réservable
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm"
        >
          {loading ? "Création..." : "Créer la formation"}
        </button>
      </form>
    </div>
  );
}

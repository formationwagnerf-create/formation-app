"use client";

import { useState } from "react";
import {
  applyChecklistToBooking,
  toggleChecklistItem,
  addChecklistItem,
  removeChecklistItem,
} from "@/lib/actions/checklist";

export default function ChecklistBlock({
  bookingId,
  initialItems,
}: {
  bookingId: string;
  initialItems: any[];
}) {
  const [items, setItems] = useState(initialItems);
  const [newLabel, setNewLabel] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleApplyDefault() {
    setLoading(true);
    await applyChecklistToBooking(bookingId);
    window.location.reload();
  }

  async function handleToggle(item: any) {
    const next = !item.is_done;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_done: next } : i)));
    await toggleChecklistItem(item.id, next);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    await addChecklistItem(bookingId, newLabel);
    setNewLabel("");
    window.location.reload();
  }

  async function handleRemove(itemId: string) {
    await removeChecklistItem(itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  }

  if (!items.length) {
    return (
      <div className="mb-6 border rounded-lg p-4">
        <p className="text-sm text-neutral-500 mb-2">Aucune checklist appliquée à ce dossier.</p>
        <button
          onClick={handleApplyDefault}
          disabled={loading}
          className="text-xs border rounded-md px-3 py-1.5"
        >
          Appliquer la checklist par défaut
        </button>
      </div>
    );
  }

  const doneCount = items.filter((i) => i.is_done).length;

  return (
    <div className="mb-6 border rounded-lg p-4">
      <p className="text-sm font-medium mb-2">
        Checklist ({doneCount}/{items.length})
      </p>
      <div className="space-y-1 mb-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={item.is_done} onChange={() => handleToggle(item)} />
              <span className={item.is_done ? "line-through text-neutral-400" : ""}>{item.label}</span>
              {item.is_required && <span className="text-xs text-amber-600">obligatoire</span>}
            </label>
            <button onClick={() => handleRemove(item.id)} className="text-xs text-neutral-400">
              Retirer
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Ajouter une étape"
          className="flex-1 border rounded-md px-2 py-1 text-sm"
        />
        <button type="submit" className="text-xs border rounded-md px-3 py-1.5">
          Ajouter
        </button>
      </form>
    </div>
  );
}

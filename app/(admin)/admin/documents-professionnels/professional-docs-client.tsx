"use client";

import { useState } from "react";
import {
  addProfessionalDocument,
  setProfessionalDocumentVisibility,
  deleteProfessionalDocument,
} from "@/lib/actions/documents";

const CATEGORIES = [
  "CV",
  "Attestation de vigilance URSSAF",
  "Déclaration d'activité",
  "Assurance RC professionnelle",
  "RIB",
  "Programme de formation",
  "CGV",
  "Règlement intérieur",
  "Certificat Qualiopi",
  "Diplôme",
  "Autre",
];

export default function ProfessionalDocsClient({ initialDocuments }: { initialDocuments: any[] }) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [fileUrl, setFileUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await addProfessionalDocument({ name, category, fileUrl, expiresAt: expiresAt || undefined });
      window.location.reload();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function toggleVisibility(doc: any) {
    await setProfessionalDocumentVisibility(doc.id, !doc.is_visible);
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_visible: !d.is_visible } : d))
    );
  }

  async function handleDelete(docId: string) {
    if (!confirm("Supprimer ce document ?")) return;
    await deleteProfessionalDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }

  return (
    <div className="max-w-3xl">
      <div className="space-y-2 mb-6">
        {documents.map((d) => (
          <div key={d.id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{d.name}</p>
              <p className="text-neutral-500 text-xs">
                {d.category} {d.expires_at ? `· expire le ${d.expires_at}` : ""}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => toggleVisibility(d)} className="text-xs text-neutral-500">
                {d.is_visible ? "Masquer" : "Rendre visible"}
              </button>
              <button onClick={() => handleDelete(d.id)} className="text-xs text-red-600">
                Supprimer
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Ajouter un document</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Nom du document"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="border rounded-md px-3 py-2 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <input
          placeholder="URL du fichier (après dépôt dans le stockage)"
          value={fileUrl}
          onChange={(e) => setFileUrl(e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        <div>
          <label className="block text-xs mb-1">Date d'expiration (facultatif)</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm">
          Ajouter
        </button>
      </form>
    </div>
  );
}

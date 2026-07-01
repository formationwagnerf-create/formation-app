"use client";

import { useState } from "react";
import { inviteOrganizationUser, removeOrganizationUser } from "@/lib/actions/organization-users";

type OrgUser = {
  user_id: string;
  is_org_admin: boolean;
  users: { email: string; first_name: string | null; last_name: string | null };
};

export default function OrganizationUsersClient({
  organizationId,
  initialUsers,
}: {
  organizationId: string;
  initialUsers: OrgUser[];
}) {
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await inviteOrganizationUser(organizationId, email, firstName, lastName);

    setLoading(false);
    if (!result.success) {
      setError((result as any).error ?? "Erreur inconnue");
      return;
    }
    setEmail("");
    setFirstName("");
    setLastName("");
    // Le rafraîchissement complet de la liste se fait normalement via un
    // rechargement des données serveur (revalidation), simplifié ici.
    window.location.reload();
  }

  async function handleRemove(userId: string) {
    if (!confirm("Retirer cet utilisateur de votre organisme ?")) return;
    await removeOrganizationUser(organizationId, userId);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-xl font-medium mb-1">Utilisateurs de mon organisme</h1>
      <p className="text-sm text-neutral-500 mb-6">
        Ajoutez les collègues de votre organisme qui doivent pouvoir
        consulter le catalogue et faire des demandes de réservation.
      </p>

      <div className="space-y-2 mb-6">
        {users.map((u) => (
          <div key={u.user_id} className="flex items-center justify-between border rounded-md px-3 py-2 text-sm">
            <div>
              <p className="font-medium">
                {u.users.first_name} {u.users.last_name}
                {u.is_org_admin && (
                  <span className="ml-2 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                    Administrateur
                  </span>
                )}
              </p>
              <p className="text-neutral-500">{u.users.email}</p>
            </div>
            {!u.is_org_admin && (
              <button onClick={() => handleRemove(u.user_id)} className="text-red-600 text-xs">
                Retirer
              </button>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleInvite} className="space-y-3 border-t pt-4">
        <p className="text-sm font-medium">Ajouter un utilisateur</p>
        <div className="grid grid-cols-2 gap-2">
          <input
            placeholder="Prénom"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="border rounded-md px-3 py-2 text-sm"
          />
          <input
            placeholder="Nom"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
            className="border rounded-md px-3 py-2 text-sm"
          />
        </div>
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-md px-3 py-2 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-900 text-white rounded-md px-4 py-2 text-sm"
        >
          {loading ? "Envoi de l'invitation..." : "Inviter"}
        </button>
      </form>
    </div>
  );
}

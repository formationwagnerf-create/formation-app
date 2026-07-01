# Démarrer le projet — guide pas à pas (sans connaissances en code)

Ce guide explique comment mettre en ligne l'application sans avoir à écrire
une seule ligne de code. Trois services gratuits/peu coûteux à créer :
Supabase (base de données), Vercel (hébergement), et plus tard Google Cloud
+ WhatsApp Business (intégrations).

## 1. Créer le projet Supabase

1. Aller sur supabase.com, créer un compte, créer un nouveau projet.
2. Dans l'onglet "SQL Editor", exécuter dans l'ordre les 3 fichiers de
   `supabase/migrations/` (0001, puis 0002, puis 0003) en copiant-collant
   leur contenu.
3. Dans "Project Settings > API", récupérer :
   - "Project URL" → à mettre dans `NEXT_PUBLIC_SUPABASE_URL`
   - "anon public" key → à mettre dans `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - "service_role" key → à mettre dans `SUPABASE_SERVICE_ROLE_KEY` (à garder
     totalement secrète, ne jamais la partager)

## 2. Déployer sur Vercel

1. Mettre le code sur un dépôt GitHub (Claude peut vous accompagner pour
   cette étape si besoin).
2. Sur vercel.com, "Import Project", sélectionner le dépôt.
3. Dans "Environment Variables", coller toutes les valeurs de `.env.example`
   une fois remplies.
4. Déployer. Vercel exécutera automatiquement la tâche planifiée qui fait
   avancer le calendrier de réservation chaque jour (configuré dans
   `vercel.json`).

## 3. Créer votre compte administrateur

1. Dans Supabase, onglet "Authentication", créer un utilisateur avec votre
   e-mail.
2. Dans "Table Editor > users", trouver la ligne créée automatiquement et
   modifier la colonne `role` en `admin`.

## 4. Le calendrier de réservation sur 2 ans : comment ça marche

Vous n'avez rien à faire. Chaque nuit, une tâche automatique ajoute un
nouveau jour à la fin de la fenêtre de réservation, qui reste donc toujours
ouverte exactement 2 ans à l'avance pour vos clients — pas besoin de
"recharger" le calendrier chaque année.

Si vous voulez changer cette durée (par exemple passer à 18 mois ou 3 ans),
cela se modifie dans l'administration, onglet Paramètres > Calendrier,
champ "Nombre d'années visibles" (table `settings`, clé
`calendar_rolling_years`).

## 5. Modifier les éléments courants

- **Formations et tarifs** : onglet Formations / Tarifs de l'administration.
- **Franchise kilométrique et tarif au km** : onglet Déplacements.
- **Documents professionnels** : onglet Documents professionnels.
- **Checklists** : onglet Checklists.
- **Pages du site** : onglet Pages du site (éditeur par blocs).

Chacun de ces écrans sera développé dans les prochaines étapes du projet ;
ce guide sera mis à jour à mesure.

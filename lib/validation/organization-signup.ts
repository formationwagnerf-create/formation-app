import { z } from "zod";

// Champs demandés à la création d'un compte client, conformément au
// cahier des charges (§3 — Création de compte client).
export const organizationSignupSchema = z.object({
  legalName: z.string().min(2, "La raison sociale est requise"),
  siret: z
    .string()
    .regex(/^\d{14}$/, "Le SIRET doit comporter 14 chiffres")
    .optional()
    .or(z.literal("")),
  vatNumber: z.string().optional(),
  adminAddress: z.string().min(5, "L'adresse administrative est requise"),
  billingAddress: z.string().min(5, "L'adresse de facturation est requise"),
  email: z.string().email("Adresse e-mail invalide"),
  phone: z.string().min(6, "Numéro de téléphone invalide"),
  contactFirstName: z.string().min(1, "Le prénom du responsable est requis"),
  contactLastName: z.string().min(1, "Le nom du responsable est requis"),
  contactRole: z.string().min(1, "La fonction du responsable est requise"),
  purchaseOrderNumber: z.string().optional(),
  notes: z.string().optional(),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères"),
});

export type OrganizationSignupInput = z.infer<typeof organizationSignupSchema>;

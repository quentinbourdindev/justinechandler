import { z } from "zod";

/**
 * Schémas Zod partagés. La validation des entrées se fait au bord du système
 * (server actions / route handlers), côté serveur, avant tout appel base.
 */

export const emailSchema = z
  .string()
  .trim()
  .min(3, "Email requis")
  .max(254)
  .email("Email invalide");

/** Politique mot de passe (app). Le hachage est fait côté serveur (bcrypt). */
export const passwordSchema = z
  .string()
  .min(8, "8 caractères minimum")
  .max(128, "128 caractères maximum");

export const uuidSchema = z.string().uuid("Identifiant invalide");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis").max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide")
  .refine((v) => {
    const d = new Date(v + "T00:00:00Z");
    if (Number.isNaN(d.getTime())) return false;
    const today = new Date().toISOString().slice(0, 10);
    return v >= "1900-01-01" && v <= today;
  }, "Date de naissance invalide");

const shortText = (max = 300) => z.string().trim().min(1, "Champ requis").max(max);
const longText = z.string().trim().min(1, "Champ requis").max(5000);

/** Candidature publique — 13 questions (mapping table applications). */
export const candidatureSchema = z.object({
  fullName: shortText(200),
  instagram: shortText(200),
  email: emailSchema,
  birthDate: isoDate,
  profession: shortText(500),
  motivation: longText,
  currentImage: longText,
  goal: longText,
  wordsToday: shortText(500),
  wordsToEmbody: shortText(500),
  mainBlocker: longText,
  whyNow: longText,
  commitmentLevel: shortText(1000),
});
export type CandidatureInput = z.infer<typeof candidatureSchema>;

/** Réservation d'appel découverte (page publique). */
export const bookingSchema = z.object({
  slotId: uuidSchema,
  firstName: shortText(200),
  lastName: shortText(200),
  email: emailSchema,
  phone: z.string().trim().max(40).optional().default(""),
  message: z.string().trim().max(2000).optional().default(""),
});
export type BookingInput = z.infer<typeof bookingSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mot de passe actuel requis").max(128),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1).max(128),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Les mots de passe ne correspondent pas",
  })
  .refine((d) => d.newPassword !== d.currentPassword, {
    path: ["newPassword"],
    message: "Le nouveau mot de passe doit différer de l'ancien",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

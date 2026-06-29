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

/**
 * Types du domaine — miroir EXACT des 15 ENUM de la base (db/schema.sql).
 * Source de vérité = la base. Ne jamais diverger : si un enum change en base
 * (via une migration db/), répercuter ici.
 */

export const USER_ROLES = ["cliente", "coach"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const CLIENTE_STATUSES = [
  "onboarding",
  "in_progress",
  "completed",
  "archived",
] as const;
export type ClienteStatus = (typeof CLIENTE_STATUSES)[number];

export const PILIER_STATUSES = [
  "locked",
  "in_progress",
  "submitted",
  "validated",
  "needs_revision",
] as const;
export type PilierStatus = (typeof PILIER_STATUSES)[number];

export const VALIDATION_DECISIONS = ["validated", "needs_revision"] as const;
export type ValidationDecision = (typeof VALIDATION_DECISIONS)[number];

export function isValidationDecision(v: string): v is ValidationDecision {
  return (VALIDATION_DECISIONS as readonly string[]).includes(v);
}

export const ASSET_TYPES = [
  "piece_photo",
  "moodboard",
  "look",
  "colorimetrie",
  "morphologie",
  "other",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

export const WARDROBE_CATEGORIES = ["basique", "personnalite", "dopamine"] as const;
export type WardrobeCategory = (typeof WARDROBE_CATEGORIES)[number];

export const TRI_DECISIONS = ["garder", "sortir"] as const;
export type TriDecision = (typeof TRI_DECISIONS)[number];

export const TRI_CRITERIA = ["plus_physique", "plus_correspond", "plus_aligne"] as const;
export type TriCriterion = (typeof TRI_CRITERIA)[number];

export const MORPHO_TYPES = ["H", "X", "A", "V", "O", "8"] as const;
export type MorphoType = (typeof MORPHO_TYPES)[number];

export const CONSENT_SCOPES = [
  "photos",
  "traitement_donnees",
  "ai_photo_processing",
] as const;
export type ConsentScope = (typeof CONSENT_SCOPES)[number];

export const WORD_SLOTS = ["who_she_is", "what_she_likes", "to_embody"] as const;
export type WordSlot = (typeof WORD_SLOTS)[number];

export const NOTIFICATION_TYPES = [
  "pilier_submitted",
  "pilier_validated",
  "pilier_needs_revision",
  "message_received",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const SLOT_STATUSES = ["available", "booked", "blocked"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const BOOKING_STATUSES = ["confirmed", "cancelled", "completed", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "selected",
  "rejected",
  "converted",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Numéro de pilier (1..4). */
export type PilierNumero = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Formes de lignes utilisées par l'application (sous-ensembles typés).
// `password_hash` n'apparaît JAMAIS dans une forme exposée hors lib/auth.
// ---------------------------------------------------------------------------

/** Compte de connexion, vue interne (lib/auth uniquement) avec le hash. */
export interface UserWithSecret {
  id: string;
  role: UserRole;
  email: string;
  password_hash: string;
  must_change_password: boolean;
  password_changed_at: Date | null;
  last_login_at: Date | null;
}

/** Compte de connexion, vue sûre (jamais de hash). */
export interface SafeUser {
  id: string;
  role: UserRole;
  email: string;
  must_change_password: boolean;
  password_changed_at: Date | null;
  last_login_at: Date | null;
}

/** Profil cliente (sous-ensemble courant). */
export interface Cliente {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  city: string | null;
  situation: string | null;
  status: ClienteStatus;
  birth_date: string | null; // DATE renvoyée en 'YYYY-MM-DD'
  accompaniment_start_date: string | null;
  accompaniment_end_date: string | null;
  word_who_she_is: string | null;
  word_what_she_likes: string | null;
  word_to_embody: string | null;
  created_at: Date;
  updated_at: Date;
}

/** Les 3 mots-boussole (peuvent être null tant que le Pilier 01 n'est pas validé). */
export interface BoussoleWords {
  who_she_is: string | null;
  what_she_likes: string | null;
  to_embody: string | null;
}

/** Avancement d'un pilier. */
export interface Pilier {
  id: string;
  cliente_id: string;
  numero: PilierNumero;
  status: PilierStatus;
  submitted_at: Date | null;
  validated_at: Date | null;
}

/** Ligne de la vue pending_validations (file d'attente coach). */
export interface PendingValidation {
  pilier_id: string;
  cliente_id: string;
  first_name: string;
  last_name: string;
  numero: PilierNumero;
  submitted_at: Date;
  status: PilierStatus;
}

/** Notification applicative. */
export interface AppNotification {
  id: string;
  recipient_id: string;
  type: NotificationType;
  payload: Record<string, unknown>;
  read_at: Date | null;
  created_at: Date;
}

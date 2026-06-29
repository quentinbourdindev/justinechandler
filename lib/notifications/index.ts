import "server-only";
import { sql } from "@/lib/db/client";
import type { AppNotification, NotificationType } from "@/lib/db/types";

/**
 * Création des notifications in-app.
 *
 * INVARIANT RGPD (db/schema.sql, COMMENT notifications.payload) : toute
 * notification concernant une cliente DOIT porter son id dans
 * `payload.cliente_id`. C'est ce que `forget_person(email)` purge pour effacer
 * les notifications nominatives reçues par la coach. Ce helper impose la règle :
 * impossible de créer une notif « à propos d'une cliente » sans cliente_id.
 */

const CLIENTE_SCOPED: ReadonlySet<NotificationType> = new Set([
  "pilier_submitted",
  "pilier_validated",
  "pilier_needs_revision",
  "message_received",
]);

export interface CreateNotificationInput {
  recipientId: string;
  type: NotificationType;
  /** Obligatoire pour toute notification concernant une cliente. */
  clienteId?: string;
  payload?: Record<string, unknown>;
}

export async function createNotification(
  input: CreateNotificationInput
): Promise<AppNotification> {
  const { recipientId, type } = input;
  const payload: Record<string, unknown> = { ...(input.payload ?? {}) };

  if (CLIENTE_SCOPED.has(type)) {
    if (!input.clienteId) {
      throw new Error(
        `createNotification: le type "${type}" concerne une cliente et exige clienteId (convention RGPD payload.cliente_id).`
      );
    }
    payload.cliente_id = input.clienteId;
  } else if (input.clienteId) {
    payload.cliente_id = input.clienteId;
  }

  const rows = await sql<AppNotification[]>`
    INSERT INTO notifications (recipient_id, type, payload)
    VALUES (${recipientId}, ${type}, ${sql.json(payload as Record<string, never>)})
    RETURNING id, recipient_id, type, payload, read_at, created_at
  `;
  return rows[0]!;
}

/** Notifications d'un utilisateur (récentes d'abord). */
export async function listNotifications(
  recipientId: string,
  limit = 20
): Promise<AppNotification[]> {
  return sql<AppNotification[]>`
    SELECT id, recipient_id, type, payload, read_at, created_at
      FROM notifications
     WHERE recipient_id = ${recipientId}
     ORDER BY created_at DESC
     LIMIT ${limit}
  `;
}

/** Compte des notifications non lues (badge). */
export async function countUnreadNotifications(recipientId: string): Promise<number> {
  const rows = await sql<{ n: number }[]>`
    SELECT count(*)::int AS n
      FROM notifications
     WHERE recipient_id = ${recipientId} AND read_at IS NULL
  `;
  return rows[0]?.n ?? 0;
}

/** Marque toutes les notifications d'un destinataire comme lues. */
export async function markAllNotificationsRead(recipientId: string): Promise<void> {
  await sql`
    UPDATE notifications
       SET read_at = now()
     WHERE recipient_id = ${recipientId} AND read_at IS NULL
  `;
}

/**
 * Notifie toutes les coachs qu'un pilier a été soumis (convention RGPD :
 * payload.cliente_id). Tolérant : n'échoue pas le flux si la notif échoue.
 */
export async function notifyCoachesPilierSubmitted(input: {
  coachUserIds: string[];
  clienteId: string;
  clienteName: string;
  numero: number;
}): Promise<void> {
  await Promise.all(
    input.coachUserIds.map((coachId) =>
      createNotification({
        recipientId: coachId,
        type: "pilier_submitted",
        clienteId: input.clienteId,
        payload: { pilier: input.numero, cliente: input.clienteName },
      })
    )
  );
}

/** Notifie la cliente de la décision de la coach (validé / à retoucher). */
export async function notifyClienteValidation(input: {
  clienteUserId: string;
  clienteId: string;
  numero: number;
  validated: boolean;
  comment: string | null;
}): Promise<void> {
  await createNotification({
    recipientId: input.clienteUserId,
    type: input.validated ? "pilier_validated" : "pilier_needs_revision",
    clienteId: input.clienteId,
    payload: {
      pilier: input.numero,
      message: input.validated
        ? `Ton pilier ${input.numero} est validé !`
        : `Ton pilier ${input.numero} est à retoucher.`,
      ...(input.comment ? { comment: input.comment } : {}),
    },
  });
}

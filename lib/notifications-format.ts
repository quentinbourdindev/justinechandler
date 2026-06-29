import type { AppNotification, NotificationType } from "@/lib/db/types";

/** Libellés FR des notifications (présentation). Données pures. */
const LABELS: Record<NotificationType, string> = {
  pilier_submitted: "Un pilier a été soumis",
  pilier_validated: "Un pilier a été validé",
  pilier_needs_revision: "Un pilier est à retoucher",
  message_received: "Nouveau message",
  system: "Information",
};

export function notificationLabel(n: AppNotification): string {
  // Si le payload porte un message explicite, on le privilégie.
  const message = n.payload?.["message"];
  if (typeof message === "string" && message.trim().length > 0) return message;

  const base = LABELS[n.type];
  const pilier = n.payload?.["pilier"];
  if (typeof pilier === "number") return `${base} (pilier ${pilier})`;
  return base;
}

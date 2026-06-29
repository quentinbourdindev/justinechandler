/** Formatage de dates en français. Utilisable serveur et client. */

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateFr(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(toDate(value));
}

export function formatDateTimeFr(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}

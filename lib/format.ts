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

/** « lundi 3 février » — clé/libellé de jour. */
export function formatDayFr(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(toDate(value));
}

/** « 10:30 » — heure seule. */
export function formatTimeFr(value: Date | string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(toDate(value));
}

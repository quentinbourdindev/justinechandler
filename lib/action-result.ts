/** Résultat standard d'une server action appelée programmatiquement. */
export type ActionResult = { ok: true } | { ok: false; error: string };

export const ok: ActionResult = { ok: true };
export function err(error: string): ActionResult {
  return { ok: false, error };
}

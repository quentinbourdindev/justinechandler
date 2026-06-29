import "server-only";
import { getCurrentUser } from "@/lib/auth/guards";
import type { SafeUser } from "@/lib/db/types";

/** Retourne la coach connectée, ou null. Pour les server actions admin. */
export async function coachUser(): Promise<SafeUser | null> {
  const current = await getCurrentUser();
  return current && current.user.role === "coach" ? current.user : null;
}

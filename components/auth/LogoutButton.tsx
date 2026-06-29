import { logoutAction } from "@/lib/auth/actions";
import { getCsrfToken } from "@/lib/security/csrf";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Bouton de déconnexion (server component) : formulaire POST vers la server
 * action, avec jeton CSRF. Pas d'état client nécessaire.
 */
export async function LogoutButton() {
  const csrfToken = await getCsrfToken();
  return (
    <form action={logoutAction}>
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <button type="submit" className={buttonClasses("ghost", "sm")}>
        Se déconnecter
      </button>
    </form>
  );
}

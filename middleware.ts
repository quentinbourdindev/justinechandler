import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { CSRF_COOKIE } from "@/lib/security/csrf-constants";

/**
 * Gating d'accès au bord (edge) :
 *  - vérifie la signature du JWT de session (aucune requête base ici) ;
 *  - protège les espaces /coach (coach) et /espace (cliente) par rôle ;
 *  - applique la redirection « changement de mot de passe forcé » (mcp) ;
 *  - garantit le cookie CSRF (httpOnly) sur les pages servies (un RSC ne peut
 *    pas poser de cookie pendant son rendu).
 *
 * La source de vérité reste les guards serveur (lib/auth/guards) qui rechargent
 * l'état « live » du compte en base. Le middleware est volontairement grossier.
 */

function genToken(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function homeFor(role: "coach" | "cliente"): string {
  return role === "coach" ? "/coach/tableau-de-bord" : "/espace/tableau-de-bord";
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const claims = token ? await verifySession(token) : null;

  const isCoach = pathname.startsWith("/coach");
  const isEspace = pathname.startsWith("/espace");
  const isChangePw = pathname === "/changer-mot-de-passe";
  const isLogin = pathname === "/login";
  const isProtected = isCoach || isEspace || isChangePw;

  const redirectTo = (path: string) => NextResponse.redirect(new URL(path, req.url));

  // 1. Route protégée sans session valide → login.
  if (isProtected && !claims) {
    return redirectTo("/login");
  }

  // 2. Session présente.
  if (claims) {
    // Changement de mot de passe forcé : on bloque toute navigation GET ailleurs.
    if (claims.mcp && !isChangePw) {
      return redirectTo("/changer-mot-de-passe");
    }
    // Cloisonnement par rôle.
    if (isCoach && claims.role !== "coach") return redirectTo(homeFor(claims.role));
    if (isEspace && claims.role !== "cliente") return redirectTo(homeFor(claims.role));
    // Déjà connecté sur /login → espace adéquat.
    if (isLogin) {
      return redirectTo(claims.mcp ? "/changer-mot-de-passe" : homeFor(claims.role));
    }
  }

  // 3. Laisser passer + garantir le cookie CSRF (généré si absent, propagé au RSC).
  if (!req.cookies.get(CSRF_COOKIE)) {
    const csrf = genToken();
    req.cookies.set(CSRF_COOKIE, csrf);
    const res = NextResponse.next({ request: req });
    res.cookies.set(CSRF_COOKIE, csrf, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tout sauf les assets statiques et les fichiers à extension.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|txt|xml|woff2?)$).*)",
  ],
};

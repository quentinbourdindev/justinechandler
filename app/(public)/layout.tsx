import Link from "next/link";
import { Brand } from "@/components/Brand";

/** Shell des pages publiques (landing, candidature, RDV, légales). Statique — aucun CMS. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-navy-100">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
          <Brand />
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/candidature" className="text-navy-600 hover:text-navy-800">
              Candidater
            </Link>
            <Link href="/rendez-vous" className="text-navy-600 hover:text-navy-800">
              Rendez-vous
            </Link>
            <Link href="/login" className="font-medium text-navy-700 hover:text-navy-900">
              Connexion
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="border-t border-navy-100">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-5 py-8 text-center text-xs text-navy-400 sm:flex-row sm:justify-between">
          <p>© {new Date().getFullYear()} Alia · L'IA assiste, Justine valide.</p>
          <nav className="flex gap-4">
            <Link href="/mentions-legales" className="hover:text-navy-600">Mentions légales</Link>
            <Link href="/confidentialite" className="hover:text-navy-600">Confidentialité</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

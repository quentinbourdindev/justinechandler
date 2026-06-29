import { Brand } from "@/components/Brand";

/** Shell des pages publiques (landing, login). Statique — aucune dépendance CMS. */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Brand />
      </header>
      <main className="flex flex-1 flex-col">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-5 py-8 text-center text-xs text-navy-400">
        © {new Date().getFullYear()} Alia · L'IA assiste, Justine valide.
      </footer>
    </div>
  );
}

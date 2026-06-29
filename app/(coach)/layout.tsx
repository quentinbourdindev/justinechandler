import Link from "next/link";
import { requireCoach } from "@/lib/auth/guards";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";

const NAV = [
  { href: "/coach/tableau-de-bord", label: "Tableau de bord" },
  { href: "/coach/candidatures", label: "Candidatures" },
  { href: "/coach/disponibilites", label: "Disponibilités" },
  { href: "/coach/clientes/nouvelle", label: "Nouvelle cliente" },
];

/** Shell du dashboard coach (desktop / tablette). */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireCoach();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-navy-100 bg-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
            <Brand href="/coach/tableau-de-bord" />
            <nav className="hidden items-center gap-5 text-sm sm:flex">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-navy-600 hover:text-navy-900">
                  {n.label}
                </Link>
              ))}
            </nav>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}

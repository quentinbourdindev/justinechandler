import { requireCoach } from "@/lib/auth/guards";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";

/** Shell du dashboard coach (desktop / tablette). */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  await requireCoach();

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-navy-100 bg-white">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-baseline gap-3">
              <Brand href="/coach/tableau-de-bord" />
              <span className="hidden text-sm text-navy-400 sm:inline">Espace coach</span>
            </div>
            <LogoutButton />
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
      </div>
    </ToastProvider>
  );
}

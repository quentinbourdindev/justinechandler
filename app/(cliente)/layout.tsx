import { requireCliente } from "@/lib/auth/guards";
import { getClienteByUserId, boussoleFromCliente } from "@/lib/db/clientes";
import { getPilierForCliente } from "@/lib/db/piliers";
import { Boussole } from "@/components/Boussole";
import { Brand } from "@/components/Brand";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { ToastProvider } from "@/components/ui/Toast";

/**
 * Shell de l'espace cliente (mobile-first). La BOUSSOLE (3 mots) est affichée
 * en permanence dans le header — mais reste VIDE tant que le Pilier 01 n'est pas
 * VALIDÉ par la coach (les mots existent en base pendant l'édition pour le gate,
 * mais ne deviennent la « boussole » qu'une fois validés).
 */
export default async function ClienteLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCliente();
  const cliente = await getClienteByUserId(user.id);
  const p1 = cliente ? await getPilierForCliente(cliente.id, 1) : null;
  const words =
    p1?.status === "validated"
      ? boussoleFromCliente(cliente)
      : { who_she_is: null, what_she_likes: null, to_embody: null };

  return (
    <ToastProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-30 border-b border-navy-100 bg-cream/90 backdrop-blur">
          <div className="mx-auto w-full max-w-2xl px-5 py-3">
            <div className="flex items-center justify-between">
              <Brand href="/espace/tableau-de-bord" />
              <LogoutButton />
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <span className="text-xs uppercase tracking-widest text-navy-400">
                Ta boussole
              </span>
              <Boussole words={words} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-6">{children}</main>
      </div>
    </ToastProvider>
  );
}

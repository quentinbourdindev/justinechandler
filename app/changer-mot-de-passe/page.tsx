import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/guards";
import { getCsrfToken } from "@/lib/security/csrf";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Brand } from "@/components/Brand";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Changer mon mot de passe" };

export default async function ChangePasswordPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/login");

  const forced = current.user.must_change_password;
  const csrfToken = await getCsrfToken();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <Brand href={forced ? "/changer-mot-de-passe" : "/"} />
        <LogoutButton />
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl text-navy-800">
            {forced ? "Choisis ton mot de passe" : "Changer mon mot de passe"}
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            {forced
              ? "Pour ta première connexion, définis un mot de passe personnel."
              : "Mets à jour ton mot de passe quand tu le souhaites."}
          </p>
        </div>

        <Card>
          <ChangePasswordForm csrfToken={csrfToken} />
        </Card>
      </main>
    </div>
  );
}

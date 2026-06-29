import type { Metadata } from "next";
import { getCsrfToken } from "@/lib/security/csrf";
import { LoginForm } from "@/components/auth/LoginForm";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage() {
  const csrfToken = await getCsrfToken();
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <div className="mb-6 text-center">
        <h1 className="font-display text-3xl text-navy-800">Bon retour</h1>
        <p className="mt-1 text-sm text-navy-500">Connecte-toi à ton espace Alia.</p>
      </div>

      <Card>
        <LoginForm csrfToken={csrfToken} />
      </Card>

      {showDemo && (
        <div className="mt-6 rounded-2xl border border-dashed border-navy-200 bg-white/60 p-4 text-xs text-navy-500">
          <p className="font-medium text-navy-600">Comptes de démo (soutenance)</p>
          <ul className="mt-2 space-y-1">
            <li>
              <span className="font-medium">Coach</span> — justine@image-coaching.test ·{" "}
              <code>DemoCoach2026!</code>
            </li>
            <li>
              <span className="font-medium">Cliente (1re connexion)</span> —
              lea.martin@example.test · <code>DemoLea2026!</code>
            </li>
            <li>
              <span className="font-medium">Cliente</span> — manon.petit@example.test ·{" "}
              <code>DemoManon2026!</code>
            </li>
          </ul>
        </div>
      )}
    </section>
  );
}

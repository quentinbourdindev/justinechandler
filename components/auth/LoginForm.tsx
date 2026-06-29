"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: AuthFormState = { error: null };

export function LoginForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium text-navy-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
          placeholder="ton@email.fr"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium text-navy-700">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
          placeholder="••••••••"
        />
      </div>

      {state.error && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Connexion…" className="w-full">
        Se connecter
      </SubmitButton>
    </form>
  );
}

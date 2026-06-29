"use client";

import { useActionState } from "react";
import { changePasswordAction, type AuthFormState } from "@/lib/auth/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: AuthFormState = { error: null };

function Field({
  id,
  label,
  autoComplete,
}: {
  id: string;
  label: string;
  autoComplete: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-navy-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type="password"
        autoComplete={autoComplete}
        required
        className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
        placeholder="••••••••"
      />
    </div>
  );
}

export function ChangePasswordForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(changePasswordAction, initial);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      <Field id="currentPassword" label="Mot de passe actuel" autoComplete="current-password" />
      <Field id="newPassword" label="Nouveau mot de passe" autoComplete="new-password" />
      <Field id="confirmPassword" label="Confirmer le nouveau mot de passe" autoComplete="new-password" />

      <p className="text-xs text-navy-400">8 caractères minimum.</p>

      {state.error && (
        <p role="alert" className="text-sm text-rose-600">
          {state.error}
        </p>
      )}

      <SubmitButton pendingLabel="Enregistrement…" className="w-full">
        Mettre à jour mon mot de passe
      </SubmitButton>
    </form>
  );
}

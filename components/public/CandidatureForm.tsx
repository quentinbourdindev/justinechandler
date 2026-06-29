"use client";

import { useActionState } from "react";
import { submitCandidatureAction, type PublicFormState } from "@/lib/public/actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Card } from "@/components/ui/Card";

const initial: PublicFormState = { status: "idle" };

const inputCls =
  "h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100";
const areaCls =
  "w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100";

function Field({ name, label, type = "text", placeholder }: { name: string; label: string; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-navy-700">{label}</label>
      <input id={name} name={name} type={type} required placeholder={placeholder} className={inputCls} />
    </div>
  );
}

function Area({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="text-sm font-medium text-navy-700">{label}</label>
      <textarea id={name} name={name} required rows={3} placeholder={placeholder} className={areaCls} />
    </div>
  );
}

export function CandidatureForm({ csrfToken }: { csrfToken: string }) {
  const [state, formAction] = useActionState(submitCandidatureAction, initial);

  if (state.status === "success") {
    return (
      <Card className="text-center">
        <h2 className="font-display text-2xl text-navy-800">Merci ✨</h2>
        <p className="mt-2 text-navy-600">
          Ta candidature est bien reçue. Justine la lit personnellement et revient
          vers toi très vite. Un email de confirmation t'a été envoyé.
        </p>
      </Card>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />

      <Field name="fullName" label="Nom & Prénom" />
      <Field name="instagram" label="Ton Instagram" placeholder="@toncompte" />
      <Field name="email" label="Ton email" type="email" placeholder="ton@email.fr" />
      <Field name="birthDate" label="Ta date de naissance" type="date" />
      <Field name="profession" label="Profession" />
      <Area name="motivation" label="Qu'est-ce qui t'a donné envie de candidater ?" />
      <Area name="currentImage" label="Comment définirais-tu ton image actuelle ?" />
      <Area name="goal" label="Qu'espères-tu ressentir, incarner, accomplir ?" />
      <Field name="wordsToday" label="3 mots qui te décrivent aujourd'hui" />
      <Field name="wordsToEmbody" label="3 mots de la version que tu veux incarner" />
      <Area name="mainBlocker" label="Qu'est-ce qui te freine le plus ?" />
      <Area name="whyNow" label="Pourquoi maintenant, et pas dans 6 mois ?" />
      <Field name="commitmentLevel" label="À quel point es-tu prête à t'engager ?" />

      <label className="flex items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4">
        <input type="checkbox" name="consent" required className="mt-1 h-5 w-5 shrink-0 rounded border-navy-300 text-navy-500" />
        <span className="text-sm text-navy-600">
          J'accepte que mes réponses soient traitées par Alia pour étudier ma
          candidature (données hébergées en Europe). Je peux demander leur
          suppression à tout moment.
        </span>
      </label>

      {state.status === "error" && state.error && (
        <p role="alert" className="text-sm text-rose-600">{state.error}</p>
      )}

      <SubmitButton pendingLabel="Envoi…" className="w-full">
        Envoyer ma candidature
      </SubmitButton>
    </form>
  );
}

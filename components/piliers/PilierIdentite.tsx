"use client";

import { useState, useTransition } from "react";
import { saveWordAction, submitPilierAction } from "@/lib/piliers/actions";
import { MoodboardEditor, type MoodboardItemView } from "@/components/piliers/MoodboardEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { WordSlot } from "@/lib/db/types";

interface Words {
  who_she_is: string;
  what_she_likes: string;
  to_embody: string;
}

const STEPS: { slot: WordSlot; label: string; intro: string }[] = [
  {
    slot: "who_she_is",
    label: "Qui je suis",
    intro: "Le mot qui te décrit aujourd'hui, sincèrement. Ta base.",
  },
  {
    slot: "what_she_likes",
    label: "Ce que j'aime",
    intro: "Ce qui te fait vibrer. Compose un moodboard qui te ressemble.",
  },
  {
    slot: "to_embody",
    label: "Qui je veux incarner",
    intro: "La femme que tu deviens. Ton intention.",
  },
];

export function PilierIdentite({
  pilierId,
  readOnly,
  initialWords,
  moodboardItems,
}: {
  pilierId: string;
  readOnly: boolean;
  initialWords: Words;
  moodboardItems: MoodboardItemView[];
}) {
  const [step, setStep] = useState(0);
  const [words, setWords] = useState<Words>(initialWords);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // -------- Lecture seule (pilier soumis / validé) --------
  if (readOnly) {
    return (
      <div className="space-y-5">
        <div className="grid gap-2">
          {STEPS.map((s) => (
            <Card key={s.slot} className="flex items-center justify-between">
              <span className="text-sm text-navy-500">{s.label}</span>
              <span className="font-display text-lg text-navy-800">
                {initialWords[s.slot] || "—"}
              </span>
            </Card>
          ))}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-navy-700">Mon moodboard</p>
          <MoodboardEditor pilierId={pilierId} items={moodboardItems} readOnly />
        </div>
      </div>
    );
  }

  const current = STEPS[step];
  const isRecap = step === STEPS.length;

  async function saveAndNext() {
    if (!current) return;
    const value = words[current.slot];
    setError(null);
    const res = await saveWordAction(pilierId, current.slot, value);
    if (!res.ok) return setError(res.error);
    setStep((s) => s + 1);
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await submitPilierAction(pilierId);
      // En cas de succès, l'action redirige ; sinon on affiche l'erreur.
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* Progression */}
      <div className="flex items-center gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-navy-500" : "bg-navy-100"}`}
          />
        ))}
      </div>

      {!isRecap && current ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-rose-500">
              Mot {step + 1} sur 3
            </p>
            <h2 className="mt-1 font-display text-2xl text-navy-800">{current.label}</h2>
            <p className="mt-1 text-sm text-navy-500">{current.intro}</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="word" className="text-sm font-medium text-navy-700">
              Ton mot
            </label>
            <input
              id="word"
              value={words[current.slot]}
              onChange={(e) => setWords({ ...words, [current.slot]: e.target.value })}
              maxLength={60}
              placeholder="Un seul mot…"
              className="h-12 w-full rounded-xl border border-navy-200 bg-white px-3 text-lg text-navy-800 outline-none focus:border-navy-400 focus:ring-2 focus:ring-navy-100"
            />
          </div>

          {current.slot === "what_she_likes" && (
            <div>
              <p className="mb-2 text-sm font-medium text-navy-700">Mon moodboard</p>
              <MoodboardEditor pilierId={pilierId} items={moodboardItems} />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              Retour
            </Button>
            <Button
              size="md"
              onClick={saveAndNext}
              disabled={words[current.slot].trim().length === 0}
            >
              Continuer
            </Button>
          </div>
        </div>
      ) : (
        // -------- Récapitulatif + soumission --------
        <div className="space-y-4">
          <div>
            <h2 className="font-display text-2xl text-navy-800">Tes 3 mots</h2>
            <p className="mt-1 text-sm text-navy-500">
              Relis-toi. Quand tu es prête, soumets ton Identité à Justine — c'est
              elle qui validera pour débloquer la suite.
            </p>
          </div>

          <div className="grid gap-2">
            {STEPS.map((s) => (
              <Card key={s.slot} className="flex items-center justify-between">
                <span className="text-sm text-navy-500">{s.label}</span>
                <span className="font-display text-lg text-navy-800">
                  {words[s.slot] || "—"}
                </span>
              </Card>
            ))}
          </div>

          {error && (
            <p role="alert" className="text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="flex justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep(STEPS.length - 1)}>
              Retour
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending ? "Envoi…" : "Soumettre à Justine"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

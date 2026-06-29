"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveColorProfileAction,
  saveMorphoProfileAction,
} from "@/lib/piliers/p2-actions";
import { submitPilierAction } from "@/lib/piliers/actions";
import { TagInput } from "@/components/ui/TagInput";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { PilierPhotos, type PhotoView } from "@/components/piliers/PilierPhotos";
import { cn } from "@/components/ui/cn";
import { MORPHO_TYPES, type MorphoType } from "@/lib/db/types";

const SEASONS = [
  "Printemps clair", "Printemps chaud", "Printemps vif",
  "Été clair", "Été doux", "Été froid",
  "Automne chaud", "Automne profond", "Automne doux",
  "Hiver froid", "Hiver profond", "Hiver vif",
];

const MORPHO_LABELS: Record<MorphoType, string> = {
  H: "H — droite (épaules ≈ hanches)",
  X: "X — sablier (taille marquée)",
  A: "A — pyramide (hanches > épaules)",
  V: "V — pyramide inversée (épaules > hanches)",
  O: "O — ronde (rondeurs au centre)",
  "8": "8 — sablier généreux",
};

export interface P2Initial {
  color: { season: string | null; dominantes: string[]; aEviter: string[]; makeup: string | null; hair: string | null } | null;
  morpho: { type: MorphoType; epaules: number | null; taille: number | null; hanches: number | null; valoriser: string[]; eviter: string[] } | null;
}

export function PilierMiseEnValeur({
  pilierId,
  readOnly,
  initial,
  photos,
  words,
}: {
  pilierId: string;
  readOnly: boolean;
  initial: P2Initial;
  photos: PhotoView[];
  words: { who_she_is: string | null; what_she_likes: string | null; to_embody: string | null };
}) {
  const router = useRouter();
  const [season, setSeason] = useState(initial.color?.season ?? "");
  const [dominantes, setDominantes] = useState<string[]>(initial.color?.dominantes ?? []);
  const [aEviter, setAEviter] = useState<string[]>(initial.color?.aEviter ?? []);
  const [makeup, setMakeup] = useState(initial.color?.makeup ?? "");
  const [hair, setHair] = useState(initial.color?.hair ?? "");

  const [morphoType, setMorphoType] = useState<MorphoType | "">(initial.morpho?.type ?? "");
  const [epaules, setEpaules] = useState(initial.morpho?.epaules?.toString() ?? "");
  const [taille, setTaille] = useState(initial.morpho?.taille?.toString() ?? "");
  const [hanches, setHanches] = useState(initial.morpho?.hanches?.toString() ?? "");
  const [valoriser, setValoriser] = useState<string[]>(initial.morpho?.valoriser ?? []);
  const [eviter, setEviter] = useState<string[]>(initial.morpho?.eviter ?? []);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const num = (s: string) => (s.trim() === "" ? null : Number(s)) as number | null;

  async function saveAll() {
    setError(null);
    const c = await saveColorProfileAction(pilierId, { season: season || null, dominantes, aEviter, makeup: makeup || null, hair: hair || null });
    if (!c.ok) return c;
    if (morphoType) {
      const m = await saveMorphoProfileAction(pilierId, {
        type: morphoType, epaules: num(epaules), taille: num(taille), hanches: num(hanches), valoriser, eviter,
      });
      if (!m.ok) return m;
    }
    return { ok: true } as const;
  }

  function onSave() {
    startTransition(async () => {
      const res = await saveAll();
      if (!res.ok) return setError(res.error);
      setStatus("Enregistré ✓");
      router.refresh();
    });
  }

  function onSubmit() {
    startTransition(async () => {
      const saved = await saveAll();
      if (!saved.ok) return setError(saved.error);
      const res = await submitPilierAction(pilierId);
      if (res && !res.ok) setError(res.error);
    });
  }

  const canSubmit = !readOnly && season !== "" && morphoType !== "";

  return (
    <div className="space-y-6">
      {/* Colorimétrie */}
      <Card className="space-y-4">
        <CardTitle className="text-base">Colorimétrie</CardTitle>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-navy-700">Ta saison</label>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            disabled={readOnly}
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-navy-800 outline-none focus:border-navy-400 disabled:opacity-60"
          >
            <option value="">— Choisir —</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-navy-700">Couleurs qui te subliment</label>
          <TagInput value={dominantes} onChange={setDominantes} placeholder="corail, ivoire…" disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-navy-700">Couleurs à éviter</label>
          <TagInput value={aEviter} onChange={setAEviter} placeholder="noir, bordeaux…" disabled={readOnly} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Maquillage" value={makeup} onChange={setMakeup} readOnly={readOnly} />
          <Field label="Cheveux" value={hair} onChange={setHair} readOnly={readOnly} />
        </div>
      </Card>

      {/* Morphologie */}
      <Card className="space-y-4">
        <CardTitle className="text-base">Morphologie</CardTitle>
        <div className="grid gap-2">
          {MORPHO_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              disabled={readOnly}
              onClick={() => setMorphoType(t)}
              className={cn(
                "rounded-xl border p-3 text-left text-sm transition-colors",
                morphoType === t ? "border-navy-400 bg-navy-50" : "border-navy-100 bg-white hover:border-navy-200",
                readOnly && "cursor-default"
              )}
            >
              {MORPHO_LABELS[t]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Épaules" value={epaules} onChange={setEpaules} readOnly={readOnly} />
          <NumField label="Taille" value={taille} onChange={setTaille} readOnly={readOnly} />
          <NumField label="Hanches" value={hanches} onChange={setHanches} readOnly={readOnly} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-navy-700">Coupes à valoriser</label>
          <TagInput value={valoriser} onChange={setValoriser} placeholder="cintré, encolure en V…" disabled={readOnly} />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-navy-700">Coupes à éviter</label>
          <TagInput value={eviter} onChange={setEviter} placeholder="oversize droit…" disabled={readOnly} />
        </div>
      </Card>

      {/* Recommandations croisées avec les 3 mots */}
      <Card className="bg-rose-50">
        <CardTitle className="text-base text-rose-700">Tes recommandations</CardTitle>
        <p className="mt-2 text-sm text-navy-600">
          {recoSentence(words, season, morphoType, valoriser)}
        </p>
      </Card>

      {/* Photos */}
      <Card className="space-y-3">
        <CardTitle className="text-base">Photos (lumière naturelle)</CardTitle>
        <PilierPhotos pilierId={pilierId} kind="colorimetrie" photos={photos} readOnly={readOnly} />
      </Card>

      {!readOnly && (
        <div className="space-y-2">
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          {status && <p className="text-sm text-emerald-600">{status}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onSave} disabled={pending} className="flex-1">
              Enregistrer
            </Button>
            <Button onClick={onSubmit} disabled={!canSubmit || pending} className="flex-1">
              {pending ? "…" : "Soumettre à Justine"}
            </Button>
          </div>
          {!canSubmit && (
            <p className="text-xs text-navy-400">Choisis une saison et une silhouette pour soumettre.</p>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly: boolean }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-navy-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        rows={2}
        className="w-full rounded-xl border border-navy-200 bg-white px-3 py-2 text-sm outline-none focus:border-navy-400 read-only:opacity-70"
      />
    </div>
  );
}

function NumField({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (v: string) => void; readOnly: boolean }) {
  return (
    <div className="space-y-1">
      <label className="text-xs text-navy-500">{label} (cm)</label>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="h-10 w-full rounded-xl border border-navy-200 bg-white px-2 text-sm outline-none focus:border-navy-400 read-only:opacity-70"
      />
    </div>
  );
}

function recoSentence(
  words: { who_she_is: string | null; what_she_likes: string | null; to_embody: string | null },
  season: string,
  morpho: string,
  valoriser: string[]
): string {
  const trio = [words.who_she_is, words.what_she_likes, words.to_embody].filter(Boolean).join(" · ");
  const parts: string[] = [];
  if (trio) parts.push(`Exprime ${trio}`);
  if (season) parts.push(`dans ta palette « ${season} »`);
  if (valoriser.length > 0) parts.push(`en valorisant ${valoriser.slice(0, 3).join(", ")}`);
  if (parts.length === 0) return "Renseigne ta saison et ta silhouette pour voir tes recommandations.";
  return parts.join(", ") + ".";
}

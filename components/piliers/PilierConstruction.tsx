"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addWardrobePieceAction,
  createLookAction,
  addPieceToLookAction,
  removePieceFromLookAction,
  deleteLookAction,
} from "@/lib/piliers/p4-actions";
import { deletePieceAction } from "@/lib/piliers/p3-actions";
import { assetDisplaySrc } from "@/lib/storage/display";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { PilierSubmit } from "@/components/piliers/PilierSubmit";
import { cn } from "@/components/ui/cn";
import { WARDROBE_CATEGORIES, type WardrobeCategory, type WordSlot } from "@/lib/db/types";

interface PieceView {
  id: string;
  name: string;
  display_url: string | null;
  wardrobe_category: WardrobeCategory | null;
  linked_word: WordSlot | null;
}
interface LookView {
  id: string;
  name: string;
  pieces: { id: string; name: string; display_url: string | null }[];
}

const CAT_LABEL: Record<WardrobeCategory, string> = {
  basique: "Basiques",
  personnalite: "Personnalité",
  dopamine: "Dopamine",
};

export function PilierConstruction({
  pilierId,
  readOnly,
  pieces,
  looks,
  words,
}: {
  pilierId: string;
  readOnly: boolean;
  pieces: PieceView[];
  looks: LookView[];
  words: { who_she_is: string | null; what_she_likes: string | null; to_embody: string | null };
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<WardrobeCategory>("basique");
  const [linkedWord, setLinkedWord] = useState<WordSlot | "">("");
  const [lookName, setLookName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const wordOptions = (
    [
      ["who_she_is", words.who_she_is],
      ["what_she_likes", words.what_she_likes],
      ["to_embody", words.to_embody],
    ] as const
  ).filter(([, label]) => Boolean(label)) as [WordSlot, string][];

  const wordLabel = (slot: WordSlot | null) =>
    wordOptions.find(([s]) => s === slot)?.[1] ?? null;

  function run(fn: () => Promise<{ ok: boolean; error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "ok" in res && !res.ok) return setError(res.error ?? "Erreur.");
      router.refresh();
    });
  }

  function addPiece() {
    if (!name.trim()) return setError("Nomme la pièce.");
    const fd = new FormData();
    fd.set("pilierId", pilierId);
    fd.set("name", name.trim());
    fd.set("category", category);
    if (linkedWord) fd.set("linkedWord", linkedWord);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("file", file);
    run(async () => {
      const res = await addWardrobePieceAction(fd);
      if (res.ok) {
        setName("");
        setLinkedWord("");
        if (fileRef.current) fileRef.current.value = "";
      }
      return res;
    });
  }

  return (
    <div className="space-y-6">
      {!readOnly && (
        <Card className="space-y-3">
          <CardTitle className="text-base">Ajouter une pièce</CardTitle>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Blazer corail cintré"
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 outline-none focus:border-navy-400"
          />
          <div className="flex gap-2">
            {WARDROBE_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "flex-1 rounded-xl border p-2.5 text-sm font-medium transition-colors",
                  category === c ? "border-navy-400 bg-navy-50 text-navy-700" : "border-navy-100 bg-white text-navy-600"
                )}
              >
                {CAT_LABEL[c]}
              </button>
            ))}
          </div>
          {wordOptions.length > 0 && (
            <select
              value={linkedWord}
              onChange={(e) => setLinkedWord(e.target.value as WordSlot | "")}
              className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-navy-400"
            >
              <option value="">Relier à un mot (optionnel)…</option>
              {wordOptions.map(([slot, label]) => (
                <option key={slot} value={slot}>{label}</option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2 text-sm text-navy-600">
            <span>+ Photo (optionnelle)</span>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <Button onClick={addPiece} disabled={pending} className="w-full">
            {pending ? "…" : "Ajouter la pièce"}
          </Button>
        </Card>
      )}

      {/* Catégories */}
      <div className="grid gap-4 sm:grid-cols-3">
        {WARDROBE_CATEGORIES.map((cat) => {
          const list = pieces.filter((p) => p.wardrobe_category === cat);
          return (
            <div key={cat} className="space-y-2">
              <h3 className="font-display text-base text-navy-800">
                {CAT_LABEL[cat]} <span className="text-sm text-navy-400">({list.length})</span>
              </h3>
              {list.length === 0 ? (
                <p className="text-sm text-navy-400">—</p>
              ) : (
                <ul className="space-y-2">
                  {list.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 rounded-xl border border-navy-100 bg-white p-2">
                      {p.display_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={assetDisplaySrc(p.display_url)} alt="" className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <span className="h-10 w-10 shrink-0 rounded-lg bg-navy-50" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-navy-800">{p.name}</p>
                        {wordLabel(p.linked_word) && (
                          <p className="truncate text-xs text-rose-500">{wordLabel(p.linked_word)}</p>
                        )}
                      </div>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => run(() => deletePieceAction(pilierId, p.id))}
                          aria-label="Retirer"
                          className="text-navy-300 hover:text-rose-600"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* Looks */}
      <section className="space-y-3">
        <h2 className="font-display text-lg text-navy-800">Mes looks</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <input
              value={lookName}
              onChange={(e) => setLookName(e.target.value)}
              placeholder="Nommer un look…"
              className="h-11 flex-1 rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-navy-400"
            />
            <Button
              variant="secondary"
              onClick={() => {
                if (!lookName.trim()) return setError("Nomme le look.");
                run(async () => {
                  const res = await createLookAction(pilierId, lookName, null, null);
                  if (res.ok) setLookName("");
                  return res;
                });
              }}
              disabled={pending}
            >
              Créer
            </Button>
          </div>
        )}
        {looks.length === 0 ? (
          <p className="text-sm text-navy-400">Aucun look pour l'instant.</p>
        ) : (
          <div className="space-y-3">
            {looks.map((look) => (
              <LookCard
                key={look.id}
                pilierId={pilierId}
                look={look}
                allPieces={pieces}
                readOnly={readOnly}
                onChange={(fn) => run(fn)}
              />
            ))}
          </div>
        )}
      </section>

      {!readOnly && (
        <PilierSubmit
          pilierId={pilierId}
          canSubmit={pieces.length > 0}
          hint={pieces.length === 0 ? "Ajoute au moins une pièce avant de soumettre." : undefined}
        />
      )}
    </div>
  );
}

function LookCard({
  pilierId,
  look,
  allPieces,
  readOnly,
  onChange,
}: {
  pilierId: string;
  look: LookView;
  allPieces: PieceView[];
  readOnly: boolean;
  onChange: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const inLook = new Set(look.pieces.map((p) => p.id));
  const available = allPieces.filter((p) => !inLook.has(p.id));

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-base">{look.name}</CardTitle>
        {!readOnly && (
          <button
            type="button"
            onClick={() => onChange(() => deleteLookAction(pilierId, look.id))}
            className="text-xs text-navy-400 hover:text-rose-600"
          >
            Supprimer
          </button>
        )}
      </div>
      {look.pieces.length === 0 ? (
        <p className="text-sm text-navy-400">Aucune pièce dans ce look.</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {look.pieces.map((p) => (
            <li key={p.id} className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-1 text-sm text-navy-700">
              {p.name}
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onChange(() => removePieceFromLookAction(pilierId, look.id, p.id))}
                  aria-label="Retirer du look"
                  className="text-navy-400 hover:text-rose-600"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {!readOnly && available.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const pieceId = e.target.value;
            if (pieceId) onChange(() => addPieceToLookAction(pilierId, look.id, pieceId));
          }}
          className="h-10 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-navy-400"
        >
          <option value="">+ Ajouter une pièce au look…</option>
          {available.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}
    </Card>
  );
}

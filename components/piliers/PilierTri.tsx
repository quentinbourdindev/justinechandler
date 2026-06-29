"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTriPieceAction, deletePieceAction } from "@/lib/piliers/p3-actions";
import { assetDisplaySrc } from "@/lib/storage/display";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle } from "@/components/ui/Card";
import { PilierSubmit } from "@/components/piliers/PilierSubmit";
import { cn } from "@/components/ui/cn";
import type { TriDecision, TriCriterion } from "@/lib/db/types";

interface PieceView {
  id: string;
  name: string;
  display_url: string | null;
  tri_decision: TriDecision | null;
  tri_criterion: TriCriterion | null;
}

const CRITERIA: { v: TriCriterion; l: string }[] = [
  { v: "plus_physique", l: "Ne me va plus physiquement" },
  { v: "plus_correspond", l: "Ne me correspond plus" },
  { v: "plus_aligne", l: "Plus alignée avec qui je veux être" },
];
const CRITERION_LABEL = Object.fromEntries(CRITERIA.map((c) => [c.v, c.l]));

export function PilierTri({
  pilierId,
  readOnly,
  pieces,
}: {
  pilierId: string;
  readOnly: boolean;
  pieces: PieceView[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [decision, setDecision] = useState<"garder" | "sortir">("garder");
  const [criterion, setCriterion] = useState<TriCriterion>("plus_aligne");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const kept = pieces.filter((p) => p.tri_decision === "garder");
  const removed = pieces.filter((p) => p.tri_decision === "sortir");

  function add() {
    if (!name.trim()) return setError("Nomme la pièce.");
    setError(null);
    const fd = new FormData();
    fd.set("pilierId", pilierId);
    fd.set("name", name.trim());
    fd.set("decision", decision);
    if (decision === "sortir") fd.set("criterion", criterion);
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("file", file);

    startTransition(async () => {
      const res = await addTriPieceAction(fd);
      if (!res.ok) return setError(res.error);
      setName("");
      setDecision("garder");
      setCriterion("plus_aligne");
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  }

  function remove(pieceId: string) {
    startTransition(async () => {
      const res = await deletePieceAction(pilierId, pieceId);
      if (!res.ok) return setError(res.error);
      router.refresh();
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
            placeholder="Ex. Blazer écru"
            className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 outline-none focus:border-navy-400"
          />
          <div className="flex gap-2">
            {(["garder", "sortir"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDecision(d)}
                className={cn(
                  "flex-1 rounded-xl border p-2.5 text-sm font-medium capitalize transition-colors",
                  decision === d
                    ? d === "garder"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-rose-300 bg-rose-50 text-rose-700"
                    : "border-navy-100 bg-white text-navy-600"
                )}
              >
                {d === "garder" ? "Je garde" : "Je sors"}
              </button>
            ))}
          </div>
          {decision === "sortir" && (
            <select
              value={criterion}
              onChange={(e) => setCriterion(e.target.value as TriCriterion)}
              className="h-11 w-full rounded-xl border border-navy-200 bg-white px-3 text-sm outline-none focus:border-navy-400"
            >
              {CRITERIA.map((c) => (
                <option key={c.v} value={c.v}>{c.l}</option>
              ))}
            </select>
          )}
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-navy-200 bg-navy-50/50 px-3 py-2 text-sm text-navy-600">
            <span>+ Photo (optionnelle)</span>
            <input ref={fileRef} type="file" accept="image/*" className="sr-only" />
          </label>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <Button onClick={add} disabled={pending} className="w-full">
            {pending ? "…" : "Ajouter au tri"}
          </Button>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <TriColumn title="Je garde" tone="emerald" pieces={kept} readOnly={readOnly} onRemove={remove} />
        <TriColumn title="Je sors" tone="rose" pieces={removed} readOnly={readOnly} onRemove={remove} criterionLabel={CRITERION_LABEL} />
      </div>

      {!readOnly && (
        <PilierSubmit
          pilierId={pilierId}
          canSubmit={pieces.length > 0}
          hint={pieces.length === 0 ? "Trie au moins une pièce avant de soumettre." : undefined}
        />
      )}
    </div>
  );
}

function TriColumn({
  title,
  tone,
  pieces,
  readOnly,
  onRemove,
  criterionLabel,
}: {
  title: string;
  tone: "emerald" | "rose";
  pieces: PieceView[];
  readOnly: boolean;
  onRemove: (id: string) => void;
  criterionLabel?: Record<string, string>;
}) {
  return (
    <div className="space-y-2">
      <h3 className={cn("font-display text-base", tone === "emerald" ? "text-emerald-700" : "text-rose-700")}>
        {title} <span className="text-sm text-navy-400">({pieces.length})</span>
      </h3>
      {pieces.length === 0 ? (
        <p className="text-sm text-navy-400">Rien pour l'instant.</p>
      ) : (
        <ul className="space-y-2">
          {pieces.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white p-2.5">
              {p.display_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={assetDisplaySrc(p.display_url)} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <span className="h-12 w-12 shrink-0 rounded-lg bg-navy-50" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-navy-800">{p.name}</p>
                {p.tri_criterion && criterionLabel && (
                  <p className="truncate text-xs text-navy-400">{criterionLabel[p.tri_criterion]}</p>
                )}
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onRemove(p.id)}
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
}

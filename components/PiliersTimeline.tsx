import { cn } from "@/components/ui/cn";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PILIERS_META, PILIERS_ORDER } from "@/lib/piliers-meta";
import type { Pilier } from "@/lib/db/types";

/**
 * Timeline des 4 piliers (mobile-first, verticale). Le « pas en cours » est mis
 * en évidence. Lecture seule ici (l'avancement se fait en Phase 1).
 */
export function PiliersTimeline({ piliers }: { piliers: Pilier[] }) {
  const byNumero = new Map(piliers.map((p) => [p.numero, p]));

  return (
    <ol className="space-y-3">
      {PILIERS_ORDER.map((numero, idx) => {
        const meta = PILIERS_META[numero];
        const pilier = byNumero.get(numero);
        const status = pilier?.status ?? "locked";
        const active = status === "in_progress" || status === "needs_revision";

        return (
          <li
            key={numero}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4",
              active
                ? "border-navy-300 bg-navy-50/60"
                : "border-navy-100 bg-white"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm",
                status === "validated"
                  ? "bg-emerald-100 text-emerald-700"
                  : active
                    ? "bg-navy-500 text-white"
                    : "bg-navy-100 text-navy-400"
              )}
              aria-hidden
            >
              {String(idx + 1).padStart(2, "0")}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display text-base text-navy-800">{meta.nom}</p>
                <StatusBadge status={status} />
              </div>
              <p className="mt-0.5 text-sm text-navy-500">{meta.sous_titre}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

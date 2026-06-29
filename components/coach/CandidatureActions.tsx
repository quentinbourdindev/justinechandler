"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setApplicationStatusAction,
  convertApplicationAction,
  deleteApplicationAction,
} from "@/lib/coach/applications-actions";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";

const TRIAGE: { value: string; label: string }[] = [
  { value: "new", label: "Nouvelle" },
  { value: "reviewing", label: "En examen" },
  { value: "selected", label: "Sélectionnée" },
  { value: "rejected", label: "Refusée" },
];

export function CandidatureActions({
  applicationId,
  status,
  convertedClienteId,
}: {
  applicationId: string;
  status: string;
  convertedClienteId: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  if (status === "converted") {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm">
        <p className="font-medium text-rose-700">Candidature convertie en cliente.</p>
        {convertedClienteId && (
          <a href={`/coach/clientes/${convertedClienteId}`} className="mt-1 inline-block text-rose-600 underline">
            Voir la fiche cliente →
          </a>
        )}
      </div>
    );
  }

  function setStatus(value: string) {
    startTransition(async () => {
      const res = await setApplicationStatusAction(applicationId, value);
      if (!res.ok) toast(res.error, "error");
      else router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium text-navy-700">Statut</p>
        <div className="flex flex-wrap gap-2">
          {TRIAGE.map((t) => (
            <button
              key={t.value}
              type="button"
              disabled={pending}
              onClick={() => setStatus(t.value)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                status === t.value
                  ? "border-navy-500 bg-navy-500 text-white"
                  : "border-navy-200 bg-white text-navy-600 hover:border-navy-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-navy-100 pt-4">
        <ConfirmModal
          trigger={<Button>Convertir en cliente</Button>}
          title="Convertir cette candidate en cliente ?"
          description="Un compte sera créé et un email d'invitation (avec mot de passe temporaire) lui sera envoyé."
          confirmLabel="Convertir & inviter"
          onConfirm={async () => {
            const res = await convertApplicationAction(applicationId);
            if (res && !res.ok) toast(res.error, "error");
          }}
        />
        <ConfirmModal
          trigger={<Button variant="subtle">Supprimer</Button>}
          title="Supprimer cette candidature ?"
          description="Action définitive (droit à l'oubli). Les données de la candidature seront effacées."
          confirmLabel="Supprimer définitivement"
          destructive
          onConfirm={async () => {
            const res = await deleteApplicationAction(applicationId);
            if (res && !res.ok) toast(res.error, "error");
          }}
        />
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth/guards";
import { getApplication } from "@/lib/db/applications-admin";
import { Card, CardTitle } from "@/components/ui/Card";
import { ApplicationStatusBadge } from "@/components/coach/ApplicationStatusBadge";
import { CandidatureActions } from "@/components/coach/CandidatureActions";
import { formatDateFr } from "@/lib/format";
import { computeAge } from "@/lib/db/clientes";

export const metadata: Metadata = { title: "Candidature" };

export default async function CandidatureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireCoach();
  const { id } = await params;
  const app = await getApplication(id);
  if (!app) notFound();

  const age = computeAge(app.birth_date);
  const QUESTIONS: { q: string; a: string }[] = [
    { q: "Profession", a: app.profession },
    { q: "Ce qui lui a donné envie de candidater", a: app.motivation },
    { q: "Son image actuelle", a: app.current_image },
    { q: "Ce qu'elle espère ressentir / incarner / accomplir", a: app.goal },
    { q: "3 mots qui la décrivent aujourd'hui", a: app.words_today },
    { q: "3 mots de la version à incarner", a: app.words_to_embody },
    { q: "Ce qui la freine le plus", a: app.main_blocker },
    { q: "Pourquoi maintenant", a: app.why_now },
    { q: "Niveau d'engagement", a: app.commitment_level },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/coach/candidatures" className="text-sm text-navy-500 underline">
          ← Candidatures
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <h1 className="font-display text-3xl text-navy-800">{app.full_name}</h1>
          <ApplicationStatusBadge status={app.status} />
        </div>
        <p className="mt-1 text-sm text-navy-500">
          {app.email} · {app.instagram}
          {age !== null ? ` · ${age} ans` : ""} · reçue le {formatDateFr(app.created_at)}
        </p>
      </div>

      <Card>
        <CardTitle className="text-base">Décision</CardTitle>
        <p className="mt-1 text-sm text-navy-500">L'IA assiste, tu choisis qui tu accompagnes.</p>
        <div className="mt-4">
          <CandidatureActions
            applicationId={app.id}
            status={app.status}
            convertedClienteId={app.converted_cliente_id}
          />
        </div>
      </Card>

      <div className="space-y-3">
        {QUESTIONS.map((item) => (
          <Card key={item.q}>
            <p className="text-xs uppercase tracking-wide text-navy-400">{item.q}</p>
            <p className="mt-1 whitespace-pre-line text-navy-700">{item.a}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

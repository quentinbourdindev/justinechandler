import type { Metadata } from "next";
import Link from "next/link";
import { requireCoach } from "@/lib/auth/guards";
import {
  listApplications,
  countApplicationsByStatus,
} from "@/lib/db/applications-admin";
import { Card, CardTitle, CardMuted } from "@/components/ui/Card";
import { ApplicationStatusBadge } from "@/components/coach/ApplicationStatusBadge";
import { formatDateFr } from "@/lib/format";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/db/types";
import { cn } from "@/components/ui/cn";

export const metadata: Metadata = { title: "Candidatures" };

const TAB_LABEL: Record<ApplicationStatus, string> = {
  new: "Nouvelles",
  reviewing: "En examen",
  selected: "Sélectionnées",
  rejected: "Refusées",
  converted: "Converties",
};

export default async function CandidaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireCoach();
  const { status: raw } = await searchParams;
  const status = (APPLICATION_STATUSES as readonly string[]).includes(raw ?? "")
    ? (raw as ApplicationStatus)
    : undefined;

  const [apps, counts] = await Promise.all([
    listApplications(status),
    countApplicationsByStatus(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl text-navy-800">Candidatures</h1>

      {/* Filtres par statut */}
      <div className="flex flex-wrap gap-2">
        <FilterTab href="/coach/candidatures" active={!status}>
          Toutes
        </FilterTab>
        {APPLICATION_STATUSES.map((s) => (
          <FilterTab key={s} href={`/coach/candidatures?status=${s}`} active={status === s}>
            {TAB_LABEL[s]} <span className="text-navy-400">({counts[s] ?? 0})</span>
          </FilterTab>
        ))}
      </div>

      {apps.length === 0 ? (
        <Card>
          <CardMuted>Aucune candidature dans cette catégorie.</CardMuted>
        </Card>
      ) : (
        <ul className="space-y-2">
          {apps.map((a) => (
            <li key={a.id}>
              <Link href={`/coach/candidatures/${a.id}`} className="block">
                <Card className="flex items-center justify-between gap-4 transition-colors hover:border-navy-300">
                  <div className="min-w-0">
                    <CardTitle className="text-base">{a.full_name}</CardTitle>
                    <CardMuted className="truncate">{a.email}</CardMuted>
                    <CardMuted className="text-xs">Reçue le {formatDateFr(a.created_at)}</CardMuted>
                  </div>
                  <ApplicationStatusBadge status={a.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "border-navy-500 bg-navy-500 text-white" : "border-navy-200 bg-white text-navy-600 hover:border-navy-300"
      )}
    >
      {children}
    </Link>
  );
}

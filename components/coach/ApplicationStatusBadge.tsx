import { cn } from "@/components/ui/cn";
import type { ApplicationStatus } from "@/lib/db/types";

const META: Record<ApplicationStatus, { label: string; className: string }> = {
  new: { label: "Nouvelle", className: "bg-navy-50 text-navy-700 border-navy-200" },
  reviewing: { label: "En examen", className: "bg-jaune-100 text-navy-700 border-jaune-300" },
  selected: { label: "Sélectionnée", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Refusée", className: "bg-navy-50 text-navy-400 border-navy-100" },
  converted: { label: "Convertie", className: "bg-rose-100 text-rose-600 border-rose-300" },
};

export function applicationStatusLabel(status: ApplicationStatus): string {
  return META[status].label;
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const m = META[status];
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", m.className)}>
      {m.label}
    </span>
  );
}

import { cn } from "@/components/ui/cn";
import type { PilierStatus } from "@/lib/db/types";

const STATUS_META: Record<PilierStatus, { label: string; className: string }> = {
  locked: { label: "Verrouillé", className: "bg-navy-50 text-navy-400 border-navy-100" },
  in_progress: { label: "En cours", className: "bg-navy-50 text-navy-700 border-navy-200" },
  submitted: { label: "Soumis", className: "bg-jaune-100 text-navy-700 border-jaune-300" },
  validated: { label: "Validé", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  needs_revision: { label: "À retoucher", className: "bg-rose-100 text-rose-600 border-rose-300" },
};

export function StatusBadge({ status, className }: { status: PilierStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

export function pilierStatusLabel(status: PilierStatus): string {
  return STATUS_META[status].label;
}

import { cn } from "@/components/ui/cn";

/**
 * Ligne de consentement (case à cocher + libellé + description). Présentationnel,
 * utilisable dans un formulaire (case native → FormData).
 */
export function ConsentToggle({
  name,
  title,
  description,
  required = false,
  defaultChecked = false,
}: {
  name: string;
  title: string;
  description: string;
  required?: boolean;
  defaultChecked?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl border border-navy-100 bg-white p-4",
        "hover:border-navy-200"
      )}
    >
      <input
        type="checkbox"
        name={name}
        required={required}
        defaultChecked={defaultChecked}
        className="mt-1 h-5 w-5 shrink-0 rounded border-navy-300 text-navy-500 focus:ring-navy-300"
      />
      <span>
        <span className="flex items-center gap-2 font-medium text-navy-800">
          {title}
          {required && <span className="text-xs text-rose-500">(obligatoire)</span>}
        </span>
        <span className="mt-0.5 block text-sm text-navy-500">{description}</span>
      </span>
    </label>
  );
}

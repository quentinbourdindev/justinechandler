import Link from "next/link";
import { cn } from "@/components/ui/cn";

/** Mot-symbole « Alia ». */
export function Brand({
  href = "/",
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "font-display text-2xl tracking-tight text-navy-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-300 rounded",
        className
      )}
    >
      Alia
    </Link>
  );
}

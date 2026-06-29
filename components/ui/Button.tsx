import { cn } from "@/components/ui/cn";
import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "subtle";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-400 focus-visible:ring-offset-2 " +
  "disabled:opacity-60 disabled:cursor-not-allowed select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-navy-500 text-white hover:bg-navy-600 shadow-soft",
  secondary: "border border-navy-200 text-navy-700 bg-white hover:bg-navy-50",
  ghost: "text-navy-700 hover:bg-navy-50",
  subtle: "bg-rose-100 text-rose-600 hover:bg-rose-200",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

/** Classes d'un bouton — réutilisables sur un <Link> ou un <button>. */
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
): string {
  return cn(base, variants[variant], sizes[size], className);
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...props} />
  );
}

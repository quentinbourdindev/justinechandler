"use client";

import { useState, type KeyboardEvent } from "react";
import { cn } from "@/components/ui/cn";

/** Saisie de listes de mots (couleurs, recommandations…). Entrée/virgule = ajout. */
export function TagInput({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-1.5 rounded-xl border border-navy-200 bg-white p-2",
        disabled && "opacity-60",
        className
      )}
    >
      {value.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-navy-100 px-2.5 py-0.5 text-sm text-navy-700"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((t) => t !== tag))}
              aria-label={`Retirer ${tag}`}
              className="text-navy-400 hover:text-navy-700"
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!disabled && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={add}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[8rem] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      )}
    </div>
  );
}

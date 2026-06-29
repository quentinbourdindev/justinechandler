"use client";

import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/Button";

/**
 * Modale de confirmation accessible (Radix Dialog : focus trap, Échap, aria).
 * Le déclencheur est passé via `trigger` ; `onConfirm` est exécuté à la
 * validation. Pensée pour les actions sensibles (suppression RGPD, etc.).
 */
export function ConfirmModal({
  trigger,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  onConfirm,
  destructive = false,
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
  destructive?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(28rem,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-card focus:outline-none">
          <Dialog.Title className="font-display text-lg text-navy-800">{title}</Dialog.Title>
          {description && (
            <Dialog.Description className="mt-2 text-sm text-navy-500">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <Button variant="secondary" size="sm">
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              variant={destructive ? "subtle" : "primary"}
              size="sm"
              onClick={handleConfirm}
              disabled={busy}
            >
              {busy ? "Un instant…" : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

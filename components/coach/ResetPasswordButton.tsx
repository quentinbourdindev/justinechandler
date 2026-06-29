"use client";

import { resetClientePasswordAction } from "@/lib/coach/clientes-actions";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function ResetPasswordButton({ clienteId }: { clienteId: string }) {
  const { toast } = useToast();
  return (
    <ConfirmModal
      trigger={<Button variant="secondary" size="sm">Réinitialiser le mot de passe</Button>}
      title="Réinitialiser le mot de passe ?"
      description="Un nouveau mot de passe temporaire sera généré et envoyé par email à la cliente (changement forcé à la prochaine connexion)."
      confirmLabel="Réinitialiser & envoyer"
      onConfirm={async () => {
        const res = await resetClientePasswordAction(clienteId);
        if (res.ok) toast("Email de réinitialisation envoyé.", "success");
        else toast(res.error, "error");
      }}
    />
  );
}

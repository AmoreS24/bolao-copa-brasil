"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type ManualPaymentConfirmButtonProps = {
  paymentId: string;
};

export function ManualPaymentConfirmButton({ paymentId }: ManualPaymentConfirmButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function confirmPayment() {
    const confirmed = window.confirm("Confirma que este pagamento foi recebido no Asaas?");

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/confirmar-pagamento", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pagamento_id: paymentId })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível confirmar o pagamento.");
      }

      setMessage(payload.message || "Pagamento confirmado manualmente com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-1">
      <button
        type="button"
        onClick={confirmPayment}
        disabled={loading}
        className="min-h-9 rounded-full bg-brasil-green px-3 text-xs font-black text-white shadow-field disabled:opacity-60"
      >
        {loading ? "Confirmando..." : "Confirmar manualmente"}
      </button>
      {message ? <p className="max-w-44 text-xs font-bold text-brasil-green">{message}</p> : null}
    </div>
  );
}

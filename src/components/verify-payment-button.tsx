"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

type VerifyPaymentButtonProps = {
  paymentId: string;
  initialPaid: boolean;
};

export function VerifyPaymentButton({ paymentId, initialPaid }: VerifyPaymentButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(
    initialPaid ? "✅ Palpite validado com sucesso!" : ""
  );
  const [paid, setPaid] = useState(initialPaid);

  async function verifyPayment() {
    if (loading || paid) {
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/pagamentos/verificar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ pagamento_id: paymentId })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível verificar o pagamento.");
      }

      if (payload.paid) {
        setPaid(true);
        setMessage("✅ Palpite validado com sucesso!");
        router.refresh();
        return;
      }

      setMessage("Pagamento ainda não identificado. Tente novamente em alguns segundos.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível verificar o pagamento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 grid gap-2">
      <button
        type="button"
        onClick={verifyPayment}
        disabled={loading || paid}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-brasil-green px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
        {loading ? "Verificando..." : "Verificar pagamento"}
      </button>
      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm font-black ${
            paid ? "bg-brasil-green/10 text-brasil-green" : "text-slate-600"
          }`}
        >
          {message}
        </p>
      ) : null}
      {paid ? (
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center rounded-full bg-brasil-blue px-4 py-2 text-sm font-black text-white"
        >
          Ir para meu painel
        </Link>
      ) : null}
    </div>
  );
}

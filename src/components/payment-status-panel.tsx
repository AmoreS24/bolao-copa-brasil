"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Radio, Trophy } from "lucide-react";
import { CopyPixButton } from "@/components/copy-pix-button";
import { SUPPORT_WHATSAPP_URL } from "@/lib/support";
import { currency } from "@/lib/utils";

type GuessSummary = {
  id: string;
  label: string;
};

type PaymentStatusPanelProps = {
  paymentId: string;
  initialPaid: boolean;
  initialRankingAnswered: boolean;
  matchTitle: string;
  expirationLabel: string;
  pixQrCode: string;
  pixCopyPaste: string;
  subtotal: number;
  fee: number;
  total: number;
  guesses: GuessSummary[];
};

type PaymentStatusResponse = {
  status?: string;
  paid?: boolean;
  rankingAnswered?: boolean;
  error?: string;
};

function qrCodeSource(value: string) {
  if (!value) {
    return "";
  }

  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

export function PaymentStatusPanel({
  paymentId,
  initialPaid,
  initialRankingAnswered,
  matchTitle,
  expirationLabel,
  pixQrCode,
  pixCopyPaste,
  subtotal,
  fee,
  total,
  guesses
}: PaymentStatusPanelProps) {
  const [paid, setPaid] = useState(initialPaid);
  const [rankingAnswered, setRankingAnswered] = useState(initialRankingAnswered);
  const [statusMessage, setStatusMessage] = useState(
    initialPaid ? "Pagamento aprovado." : "Aguardando confirmação do pagamento..."
  );

  useEffect(() => {
    if (paid) {
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch(`/api/pagamentos/status?id=${encodeURIComponent(paymentId)}`, {
          cache: "no-store"
        });
        const payload = (await response.json().catch(() => ({}))) as PaymentStatusResponse;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setStatusMessage(payload.error ?? "Não foi possível consultar o pagamento agora.");
          return;
        }

        setRankingAnswered(Boolean(payload.rankingAnswered));

        if (payload.paid) {
          setPaid(true);
          setStatusMessage("Pagamento aprovado.");
          return;
        }

        setStatusMessage("Aguardando confirmação do pagamento...");
      } catch {
        if (!cancelled) {
          setStatusMessage("Aguardando confirmação do pagamento...");
        }
      }
    }

    void checkStatus();
    const intervalId = window.setInterval(checkStatus, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [paid, paymentId]);

  if (paid) {
    return (
      <div className="grid gap-5">
        <div className="rounded-lg bg-brasil-green p-6 text-center text-white shadow-field md:p-8">
          <CheckCircle2 className="mx-auto mb-3 text-white" size={52} aria-hidden />
          <h1 className="text-3xl font-black md:text-4xl">✅ Seu palpite foi registrado com sucesso!</h1>
          <p className="mx-auto mt-3 max-w-xl text-lg font-semibold text-white/90">
            Agora você já está concorrendo ao prêmio da rodada.
          </p>
        </div>

        <div className="rounded-lg border border-brasil-yellow/50 bg-brasil-navy p-5 text-white shadow-field md:p-6">
          <Trophy className="mb-3 text-brasil-yellow" size={36} aria-hidden />
          <p className="text-sm font-black uppercase text-brasil-yellow">🏆 Bônus: Ranking da Torcida</p>
          <h2 className="mt-1 text-2xl font-black">Responda as perguntas da rodada</h2>
          <p className="mt-2 font-semibold leading-relaxed text-white/85">
            Responda as perguntas da rodada e acumule pontos no Ranking da Torcida.
          </p>
          {rankingAnswered ? (
            <Link
              href="/dashboard"
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 font-black text-brasil-navy shadow-field"
            >
              Ir para Meus Palpites
            </Link>
          ) : (
            <Link
              href={`/ranking-bonus?pagamento=${paymentId}`}
              className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-brasil-yellow px-6 font-black text-brasil-blue shadow-field"
            >
              Responder Ranking da Torcida
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-lg bg-brasil-navy p-4 text-white">
        <p className="text-sm font-black uppercase text-brasil-yellow">Rodada</p>
        <h1 className="mt-1 text-2xl font-black">{matchTitle}</h1>
        <p className="mt-1 font-semibold text-white/85">Validade do Pix: {expirationLabel}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
        <div className="grid min-h-48 place-items-center rounded-lg bg-brasil-light p-5 text-brasil-blue">
          {pixQrCode ? (
            <div className="grid justify-items-center gap-3">
              <img src={qrCodeSource(pixQrCode)} alt="QR Code Pix" className="h-44 w-44 object-contain" />
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm font-black text-brasil-blue"
              >
                Não conseguiu concluir o pagamento? Falar com suporte
              </a>
            </div>
          ) : (
            <div className="grid justify-items-center gap-3">
              <p className="px-4 text-center text-sm font-bold text-slate-600">QR Code indisponível.</p>
              <a
                href={SUPPORT_WHATSAPP_URL}
                target="_blank"
                rel="noreferrer"
                className="text-center text-sm font-black text-brasil-blue"
              >
                Não conseguiu concluir o pagamento? Falar com suporte
              </a>
            </div>
          )}
        </div>
        <div className="rounded-lg bg-brasil-light p-4">
          <p className="text-sm font-bold text-slate-500">Pix copia e cola</p>
          <div className="mt-1 flex items-center gap-3">
            <p className="min-w-0 flex-1 break-words text-sm font-black text-brasil-navy">
              {pixCopyPaste || "Pix copia e cola indisponível."}
            </p>
            <CopyPixButton payload={pixCopyPaste} />
          </div>
          <p className="mt-3 text-sm font-bold text-slate-600">A cobrança expira em 5 minutos.</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-500">Palpites</p>
          <p className="text-2xl font-black text-brasil-green">{currency(subtotal)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-500">Taxa operacional</p>
          <p className="text-2xl font-black text-brasil-navy">{currency(fee)}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm font-bold text-slate-500">Total</p>
          <p className="text-2xl font-black text-brasil-blue">{currency(total)}</p>
        </div>
      </div>

      <div className="rounded-lg bg-brasil-light p-4">
        <p className="font-black text-brasil-navy">Resumo dos palpites</p>
        <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
          {guesses.map((guess) => (
            <p key={guess.id}>{guess.label}</p>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-brasil-green/30 bg-white p-4">
        <p className="flex items-center gap-2 text-lg font-black text-brasil-navy">
          <Radio size={20} className="text-brasil-green" aria-hidden />
          {statusMessage}
        </p>
        <p className="mt-2 font-semibold leading-relaxed text-slate-600">
          Você não precisa clicar em atualizar. Esta tela consulta a confirmação automaticamente a cada 5 segundos.
        </p>
      </div>
    </div>
  );
}

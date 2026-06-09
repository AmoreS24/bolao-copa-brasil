import { Radio } from "lucide-react";
import { PageShell, SectionTitle } from "@/components/ui";
import { getMatchById } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { currency } from "@/lib/utils";
import { CopyPixButton } from "@/components/copy-pix-button";
import { VerifyPaymentButton } from "@/components/verify-payment-button";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;

function asNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatExpiration(value: unknown) {
  const date = new Date(asString(value));

  if (Number.isNaN(date.getTime())) {
    return "5 minutos";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function qrCodeSource(value: string) {
  if (!value) {
    return "";
  }

  return value.startsWith("data:") ? value : `data:image/png;base64,${value}`;
}

export default async function PaymentPage({
  searchParams
}: {
  searchParams?: { pagamento?: string };
}) {
  const supabase = getSupabaseServerClient();
  const user = getCurrentUser();
  const paymentId = searchParams?.pagamento;

  if (!paymentId || !supabase || !user) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
          <SectionTitle eyebrow="Pagamento Pix" title="Pagamento não encontrado" />
          <p className="font-semibold text-slate-600">Gere um Pix a partir da tela de palpites para continuar.</p>
        </section>
      </PageShell>
    );
  }

  const [{ data: payment }, { data: guesses }] = await Promise.all([
    supabase.from("pagamentos").select("*").eq("id", paymentId).eq("perfil_id", user.id).maybeSingle(),
    supabase.from("apostas").select("*").eq("pagamento_id", paymentId).eq("perfil_id", user.id)
  ]);
  const paymentRow = payment as DbRow | null;
  const guessRows = (guesses ?? []) as DbRow[];
  const matchId = asString(guessRows[0]?.jogo_id);
  const match = matchId ? await getMatchById(matchId) : null;

  if (!paymentRow) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
          <SectionTitle eyebrow="Pagamento Pix" title="Pagamento não encontrado" />
          <p className="font-semibold text-slate-600">Não encontramos a cobrança solicitada.</p>
        </section>
      </PageShell>
    );
  }

  const subtotal = asNumber(paymentRow.valor_palpites);
  const fee = asNumber(paymentRow.taxa_operacional);
  const total = asNumber(paymentRow.valor_total);
  const pixCopyPaste = asString(paymentRow.pix_copia_cola);
  const pixQrCode = asString(paymentRow.pix_qr_code);
  const paymentStatus = asString(paymentRow.status);
  const isPaid = paymentStatus === "paid" || paymentStatus === "pago";

  console.log("[Pagamento Pix] pix_qr_code recebido", {
    paymentId,
    pixQrCodeLength: pixQrCode.length,
    pixQrCodePreview: pixQrCode.slice(0, 50),
    hasPixQrCode: Boolean(pixQrCode)
  });

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
        <SectionTitle eyebrow="Pagamento Pix" title="Cobrança Asaas gerada" />
        <div className="grid gap-4">
          <div className="rounded-lg bg-brasil-navy p-4 text-white">
            <p className="text-sm font-black uppercase text-brasil-yellow">Rodada</p>
            <h1 className="mt-1 text-2xl font-black">
              {match ? `${match.homeTeam} x ${match.awayTeam}` : "Jogo do Brasil"}
            </h1>
            <p className="mt-1 font-semibold text-white/85">Validade do Pix: {formatExpiration(paymentRow.expira_em)}</p>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
            <div className="grid min-h-48 place-items-center rounded-lg bg-brasil-light p-5 text-brasil-blue">
              {pixQrCode ? (
                <img src={qrCodeSource(pixQrCode)} alt="QR Code Pix" className="h-44 w-44 object-contain" />
              ) : (
                <p className="px-4 text-center text-sm font-bold text-slate-600">QR Code indisponível.</p>
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
              {guessRows.map((guess, index) => (
                <p key={asString(guess.id) || index}>
                  {match?.homeTeam ?? "Brasil"} {asNumber(guess.gols_brasil)}x{asNumber(guess.gols_adversario)}{" "}
                  {match?.awayTeam ?? "Adversário"}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-brasil-green/30 bg-white p-4">
            <p className="flex items-center gap-2 text-lg font-black text-brasil-navy">
              <Radio size={20} className="text-brasil-green" aria-hidden />
              Status: {isPaid ? "Pagamento aprovado" : "Aguardando pagamento"}
            </p>
            <p className="mt-2 font-semibold leading-relaxed text-slate-600">
              {isPaid
                ? "Pagamento aprovado! Seu palpite foi confirmado."
                : "Seus palpites ficam pendentes até a confirmação automática do Asaas."}
            </p>
            <VerifyPaymentButton paymentId={paymentId} initialPaid={isPaid} />
          </div>
        </div>
      </section>
    </PageShell>
  );
}

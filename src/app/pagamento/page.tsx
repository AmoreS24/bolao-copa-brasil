import { PageShell, SectionTitle } from "@/components/ui";
import { getMatchById } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { PaymentStatusPanel } from "@/components/payment-status-panel";

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

const PAID_PAYMENT_STATUSES = new Set(["paid", "pago", "confirmed", "received", "PAYMENT_RECEIVED"]);

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
  const isPaid = PAID_PAYMENT_STATUSES.has(paymentStatus);
  const { data: existingVote } = matchId
    ? await supabase
      .from("torcida_votos")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("jogo_id", matchId)
      .maybeSingle()
    : { data: null };
  const matchTitle = match ? `${match.homeTeam} x ${match.awayTeam}` : "Jogo do Brasil";
  const isRoundThree = match?.homeTeam.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === "escocia"
    && match?.awayTeam.trim().toLowerCase() === "brasil";
  const currentMinimumPrize = isRoundThree ? 250 : match?.guaranteedPrize ?? 250;
  const currentPrize = Math.max(currentMinimumPrize, (match?.confirmedGuesses ?? 0) * 10 * 0.6);
  const originRef = asString(paymentRow.origem_ref);
  const shareLink = originRef
    ? `https://bolao-copa-brasil.vercel.app?ref=${encodeURIComponent(originRef)}`
    : "https://bolao-copa-brasil.vercel.app";
  const guessSummary = guessRows.map((guess, index) => ({
    id: asString(guess.id) || String(index),
    score: `${asNumber(guess.gols_brasil)} x ${asNumber(guess.gols_adversario)}`,
    label: `${match?.homeTeam ?? "Brasil"} ${asNumber(guess.gols_brasil)}x${asNumber(guess.gols_adversario)} ${match?.awayTeam ?? "Adversário"}`
  }));

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
        <SectionTitle eyebrow="Pagamento Pix" title="Cobrança Asaas gerada" />
        <PaymentStatusPanel
          paymentId={paymentId}
          initialPaid={isPaid}
          initialRankingAnswered={Boolean(existingVote)}
          matchTitle={matchTitle}
          expirationLabel={formatExpiration(paymentRow.expira_em)}
          pixQrCode={pixQrCode}
          pixCopyPaste={pixCopyPaste}
          subtotal={subtotal}
          fee={fee}
          total={total}
          guesses={guessSummary}
          currentPrize={currentPrize}
          shareLink={shareLink}
        />
      </section>
    </PageShell>
  );
}

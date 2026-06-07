import Link from "next/link";
import { CheckCircle2, Copy, QrCode, Radio } from "lucide-react";
import { PageShell, SectionTitle } from "@/components/ui";
import { getMatchById, getNextMatch } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PaymentPage({
  searchParams
}: {
  searchParams?: { jogo?: string; palpites?: string };
}) {
  const match = searchParams?.jogo ? await getMatchById(searchParams.jogo) : await getNextMatch();

  if (!match) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
          <SectionTitle eyebrow="Pagamento Pix" title="Jogo não encontrado" />
          <p className="font-semibold text-slate-600">Cadastre um jogo no Supabase antes de gerar o Pix.</p>
        </section>
      </PageShell>
    );
  }

  const guesses = searchParams?.palpites
    ? searchParams.palpites.split(",").filter(Boolean)
    : ["1x0"];
  const subtotal = guesses.length * match.entryValue;
  const total = subtotal + match.operationalFee;
  const pixCopyPaste = `00020126580014br.gov.bcb.pix0136asaas-${match.id}-${guesses.length}-palpites520400005303986540${total
    .toFixed(2)
    .replace(".", "")}5802BR5909BOLAO BR6009SAO PAULO62070503***6304`;

  return (
    <PageShell>
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
        <SectionTitle eyebrow="Pagamento Pix" title="Cobrança Asaas gerada" />
        <div className="grid gap-4">
          <div className="rounded-lg bg-brasil-navy p-4 text-white">
            <p className="text-sm font-black uppercase text-brasil-yellow">Rodada</p>
            <h1 className="mt-1 text-2xl font-black">{match.homeTeam} x {match.awayTeam}</h1>
            <p className="mt-1 font-semibold text-white/85">
              {match.dateLabel}, {match.timeLabel} - {match.venue}
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr]">
            <div className="grid min-h-48 place-items-center rounded-lg bg-brasil-light p-5 text-brasil-blue">
              <QrCode size={128} strokeWidth={1.8} aria-hidden />
            </div>
            <div className="rounded-lg bg-brasil-light p-4">
              <p className="text-sm font-bold text-slate-500">Pix copia e cola</p>
              <div className="mt-1 flex items-center gap-3">
                <p className="min-w-0 flex-1 break-words text-sm font-black text-brasil-navy">{pixCopyPaste}</p>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brasil-yellow text-brasil-blue">
                  <Copy size={18} aria-hidden />
                </span>
              </div>
              <p className="mt-3 text-sm font-bold text-slate-600">Cobrança criada a partir dos dados do Supabase.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-500">Palpites escolhidos</p>
              <p className="text-2xl font-black text-brasil-green">{guesses.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-4">
              <p className="text-sm font-bold text-slate-500">Total</p>
              <p className="text-2xl font-black text-brasil-blue">{currency(total)}</p>
            </div>
          </div>

          <div className="rounded-lg bg-brasil-light p-4">
            <p className="font-black text-brasil-navy">Resumo</p>
            <div className="mt-2 grid gap-2 text-sm font-semibold text-slate-700">
              {guesses.map((guess, index) => (
                <p key={`${guess}-${index}`}>{match.homeTeam} {guess} {match.awayTeam}</p>
              ))}
              <p>Palpites: {currency(subtotal)}</p>
              <p>Taxa operacional única: {currency(match.operationalFee)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-brasil-green/30 bg-white p-4">
            <p className="flex items-center gap-2 text-lg font-black text-brasil-navy">
              <Radio size={20} className="text-brasil-green" aria-hidden />
              Status: aguardando confirmação automática
            </p>
            <p className="mt-2 font-semibold leading-relaxed text-slate-600">
              O webhook do Asaas confirma o pagamento, muda o status para pago e deixa os palpites confirmados. Sem pagamento,
              o usuário não entra no bolão.
            </p>
          </div>

          <Link
            href="/ranking"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 text-center font-black text-white shadow-field"
          >
            <CheckCircle2 size={19} aria-hidden />
            Simular Pix aprovado e votar no ranking
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

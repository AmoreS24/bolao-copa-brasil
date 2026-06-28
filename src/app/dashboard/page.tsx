import { Flag, Goal, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { PageShell, PrimaryLink, SectionTitle, StatCard } from "@/components/ui";
import { getActiveMatch, getDashboardEngagement, getProfileSummary, getUpcomingMatches, getPrizeValue } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    aguardando: "⏳ Aguardando resultado",
    vencedor: "🏆 Palpite vencedor",
    perdedor: "❌ Palpite não vencedor",
    confirmed: "Confirmado ✅",
    pending_payment: "Aguardando pagamento",
    paid: "Pago ✅",
    pending: "Pendente"
  };

  return labels[status] ?? status;
}

export default async function DashboardPage() {
  const [matches, prize, profile, engagement, nextMatch] = await Promise.all([
    getUpcomingMatches(),
    getPrizeValue(),
    getProfileSummary(),
    getDashboardEngagement(),
    getActiveMatch()
  ]);
  const daysUntilClose = engagement
    ? Math.max(0, Math.ceil((new Date(engagement.bettingClosesAt).getTime() - Date.now()) / 86_400_000))
    : 0;
  const notices = engagement
    ? [
      `🏆 Rodada ${engagement.roundNumber} aberta`,
      daysUntilClose === 0 ? "⏰ Apostas encerram hoje" : `⏰ Apostas encerram em ${daysUntilClose} ${daysUntilClose === 1 ? "dia" : "dias"}`,
      engagement.needsRankingAnswer ? "🎯 Você ainda não respondeu o Ranking da Torcida" : "",
      engagement.rankingPosition ? `📈 Você está em ${engagement.rankingPosition}º lugar no Ranking` : "",
      `💰 Prêmio atual: ${currency(engagement.currentPrize)}`
    ].filter(Boolean)
    : [];

  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase text-brasil-green">Dashboard do usuario</p>
          <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Ola, {profile.name}</h1>
          <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-slate-600">
            Aqui você acompanha seus palpites realizados, pagamentos confirmados e sua participação nos jogos do Brasil.
          </p>
        </div>
        <PrimaryLink href={nextMatch ? `/jogos/${nextMatch.id}` : "/"}>Participar do proximo jogo</PrimaryLink>
      </div>
      {notices.length > 0 ? (
        <section className="mb-6 rounded-lg border border-brasil-yellow/50 bg-white p-5 shadow-field">
          <h2 className="text-xl font-black text-brasil-navy">🔔 Avisos</h2>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {notices.map((notice) => (
              <p key={notice} className="rounded-lg bg-brasil-light px-4 py-3 font-black text-slate-700">{notice}</p>
            ))}
          </div>
        </section>
      ) : null}
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Goal} label="Prêmio garantido" value={currency(engagement?.currentPrize ?? prize)} />
        <StatCard icon={Trophy} label="Ranking" value={currency(nextMatch?.rankingPool ?? 0)} tone="yellow" />
        <StatCard icon={Users} label="Sua posicao" value={engagement?.rankingPosition ? `${engagement.rankingPosition}º` : "-"} tone="blue" />
        <StatCard icon={Flag} label="Palpites enviados" value={`${profile.history.length}`} />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Rodadas" title="Proximos jogos do Brasil" />
        <div className="grid gap-4 md:grid-cols-3">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
          {matches.length === 0 ? (
            <div className="rounded-lg bg-white p-4 font-semibold text-slate-600 shadow-field">
              Nenhum jogo cadastrado no Supabase.
            </div>
          ) : null}
        </div>
      </section>
      <section className="mt-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <SectionTitle eyebrow="Historico" title="Jogos em que participou" />
          <Link
            href="/dashboard/desempenho"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-brasil-blue px-5 font-black text-white shadow-field"
          >
            📊 Ver meu desempenho
          </Link>
        </div>
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {profile.history.map((item, index) => (
            <div key={`${item.match}-${item.guess}-${index}`} className="grid gap-3 border-b border-slate-100 p-4 last:border-0">
              <div className="grid gap-2 md:grid-cols-4">
                <div>
                  <p className="font-black text-brasil-navy">{item.match}</p>
                  <p className="text-sm font-semibold text-slate-500">{item.dateLabel || "Data a confirmar"}</p>
                </div>
                <p className="font-semibold text-slate-600">Seu palpite: {item.guess}</p>
                <p className="font-semibold text-slate-600">
                  Resultado oficial: {item.officialResult || "Aguardando"}
                </p>
                <p className="font-black text-brasil-green">{statusLabel(item.status)}</p>
              </div>
              {item.rankingBreakdown ? (
                <div className="rounded-lg bg-brasil-light p-3">
                  <p className="font-black text-brasil-navy">
                    Ranking da Torcida: {item.rankingBreakdown.total} pts na rodada
                    {item.rankingBreakdown.accumulated ? ` | acumulado ${item.rankingBreakdown.accumulated} pts` : ""}
                  </p>
                  <div className="mt-2 grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-5">
                    <span>Resultado: {item.rankingBreakdown.resultado}</span>
                    <span>Gols: {item.rankingBreakdown.gols}</span>
                    <span>Primeiro gol: {item.rankingBreakdown.primeiroGol}</span>
                    <span>Escanteios: {item.rankingBreakdown.escanteios}</span>
                    <span>Cartões: {item.rankingBreakdown.cartoes}</span>
                  </div>
                </div>
              ) : null}
            </div>
          ))}
          {profile.history.length === 0 ? (
            <div className="p-4 font-semibold text-slate-600">Nenhum palpite encontrado no Supabase.</div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

import { ArrowRight, CalendarDays, Clock, MapPin, Trophy, Users, Wallet } from "lucide-react";
import { getNextMatch, getRankingPlayers, getUpcomingMatches } from "@/data/supabase-live";
import { currency } from "@/lib/utils";
import { MatchCountdown } from "@/components/match-countdown";
import { AnimatedScoreboard } from "@/components/animated-scoreboard";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { RankingList } from "@/components/ranking-list";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [match, upcomingBrazilMatches, rankingPlayers] = await Promise.all([
    getNextMatch(),
    getUpcomingMatches(),
    getRankingPlayers(10)
  ]);

  if (!match) {
    return (
      <PageShell>
        <section className="rounded-lg bg-white p-6 shadow-field">
          <SectionTitle eyebrow="Calendário" title="Nenhum jogo cadastrado" />
          <p className="font-semibold text-slate-600">
            Cadastre o próximo jogo na tabela jogos do Supabase para liberar o bolão.
          </p>
        </section>
      </PageShell>
    );
  }

  return (
    <>
      <section className="stadium-hero">
        <div className="stadium-lights" aria-hidden />
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-3 px-4 py-6 text-center text-white md:min-h-[700px] md:gap-4 md:py-10">
          <div className="relative z-10 w-full">
            <p className="mb-2 text-sm font-black uppercase tracking-[0.14em] text-brasil-yellow md:hidden">
              {match.homeTeam} x {match.awayTeam}
            </p>
            <h1 className="match-title mx-auto max-w-4xl font-sans text-4xl font-black uppercase leading-[0.98] tracking-wide sm:text-5xl md:text-6xl">
              <span className="mr-2" aria-hidden>🇧🇷</span>
              <span className="text-brasil-yellow">{match.homeTeam}</span>
              <span className="mx-2 align-middle text-2xl text-white md:mx-4 md:text-4xl">x</span>
              <span className="text-white">{match.awayTeam}</span>
              <span className="ml-2" aria-hidden>🇲🇦</span>
            </h1>
            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold text-white/90 sm:text-base">
              <p className="flex items-center gap-1.5">
                <CalendarDays size={18} aria-hidden /> {match.dateLabel}, {match.timeLabel}
              </p>
              <p className="flex items-center gap-1.5 text-white/85">
                <MapPin size={18} aria-hidden /> {match.venue}
              </p>
              <p className="flex items-center gap-1.5">
                <Trophy size={18} className="text-brasil-yellow" aria-hidden /> {match.competition}
              </p>
              <p className="flex items-center gap-1.5 text-white/85">
                <Users size={18} className="text-brasil-yellow" aria-hidden /> {match.group}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock size={18} className="text-brasil-yellow" aria-hidden /> Apostas até {match.bettingClosesLabel}
              </p>
            </div>
            <div className="mx-auto mt-5 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/22 bg-black/28 p-3 text-white shadow-field backdrop-blur md:p-4 sm:col-span-2">
                <p className="text-xs font-black uppercase text-brasil-yellow">Data do jogo</p>
                <p className="mt-1 text-2xl font-black">{match.dateLabel}, {match.timeLabel}</p>
              </div>
              <div className="rounded-lg border border-brasil-yellow/45 bg-black/32 p-3 text-white shadow-field backdrop-blur md:p-4">
                <p className="text-xs font-black uppercase text-brasil-yellow">🏆 Prêmio estimado</p>
                <p className="mt-1 text-3xl font-black">{currency(match.exactPool)}</p>
              </div>
              <div className="rounded-lg border border-white/22 bg-black/28 p-3 text-white shadow-field backdrop-blur md:p-4">
                <p className="text-xs font-black uppercase text-brasil-yellow">💰 Cada palpite</p>
                <p className="mt-1 text-3xl font-black">{currency(match.entryValue)}</p>
              </div>
            </div>
            <div className="mt-5">
              <Link
                href="/cadastro"
                className="hero-cta inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brasil-yellow px-7 py-3 text-center text-lg font-black text-brasil-navy shadow-field transition hover:-translate-y-0.5 sm:w-auto"
              >
                🔥 ENTRAR NO BOLÃO
                <ArrowRight size={22} aria-hidden />
              </Link>
              <p className="mx-auto mt-3 max-w-sm text-center text-xs font-bold text-white/82">
                Escolha quantos placares quiser e pague por Pix para confirmar
              </p>
            </div>
          </div>

          <div className="relative z-10 grid w-full max-w-2xl gap-3">
            <div className="rounded-lg border border-white/20 bg-black/28 p-3 shadow-field backdrop-blur md:p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brasil-yellow">Contagem regressiva</p>
              <div className="mt-3">
                <MatchCountdown startsAt={match.bettingClosesAt} />
              </div>
            </div>
            <AnimatedScoreboard
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              scores={match.scoreExamples}
            />
          </div>
        </div>
      </section>

      <PageShell>
        <section>
          <SectionTitle eyebrow="Calendário" title="Próximos jogos do Brasil" />
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingBrazilMatches.slice(1).map((nextMatch) => (
              <article key={nextMatch.id} className="rounded-lg bg-white p-4 shadow-field md:p-5">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brasil-green">{nextMatch.group}</p>
                <h2 className="mt-1 text-2xl font-black text-brasil-navy">
                  {nextMatch.homeTeam} x {nextMatch.awayTeam}
                </h2>
                <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
                  <p>{nextMatch.dateLabel}, {nextMatch.timeLabel}</p>
                  <p>{nextMatch.venue}</p>
                </div>
                <Link
                  href="/cadastro"
                  className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-brasil-green px-4 font-black text-white shadow-field md:w-auto"
                >
                  Apostar nesse jogo
                </Link>
              </article>
            ))}
            {upcomingBrazilMatches.length <= 1 ? (
              <div className="rounded-lg bg-white p-4 font-semibold text-slate-600 shadow-field md:p-5">
                Nenhum outro jogo futuro cadastrado no Supabase.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={Trophy} label="Prêmio estimado da rodada" value={currency(match.exactPool)} tone="yellow" />
          <StatCard icon={Wallet} label="Cada palpite" value={currency(match.entryValue)} />
          <StatCard icon={Users} label="Palpites confirmados" value={`${match.confirmedGuesses}`} tone="blue" />
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-start">
          <div>
            <SectionTitle eyebrow="Ranking da Torcida Brasileira" title="Você também concorre no ranking" />
            <p className="rounded-lg bg-white p-5 text-base font-semibold leading-relaxed text-slate-600 shadow-field">
              Depois do Pix aprovado em {match.homeTeam} x {match.awayTeam}, você pode registrar 1 voto no
              Ranking da Torcida Brasileira para este jogo. A participação no ranking não depende da quantidade de palpites.
            </p>
            <div className="mt-4 grid gap-3">
              {[
                ["Palpite exato", "Escolha o placar do jogo e dispute o acumulado principal."],
                ["Pix obrigatório", "Sem pagamento confirmado, o palpite não participa."],
                ["Ranking da torcida", "Pagamento aprovado libera 1 voto por usuário neste jogo."]
              ].map(([title, text], index) => (
                <div key={title} className="flex gap-3 rounded-lg bg-white p-4 shadow-field">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brasil-yellow font-black text-brasil-navy">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="font-black text-brasil-navy">{title}</h3>
                    <p className="text-sm font-semibold text-slate-600">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <SectionTitle eyebrow="Top 10" title="Ranking da Torcida Brasileira" />
            <RankingList players={rankingPlayers} limit={10} />
          </div>
        </section>
      </PageShell>
    </>
  );
}

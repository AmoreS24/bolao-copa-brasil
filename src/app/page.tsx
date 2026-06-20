import { CalendarDays, Clock, Flame, MapPin, Trophy, Users, Wallet } from "lucide-react";
import { getClosedRounds, getGroupStandings, getNextMatch, getRankingPlayers, getUpcomingMatches } from "@/data/supabase-live";
import { currency } from "@/lib/utils";
import { countryFlag, countryWithFlag } from "@/lib/countries";
import { MatchCountdown } from "@/components/match-countdown";
import { AnimatedScoreboard } from "@/components/animated-scoreboard";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { RankingList } from "@/components/ranking-list";
import { AuthGate } from "@/components/auth-gate";
import { RoundVisitorTracker } from "@/components/round-visitor-tracker";

export const dynamic = "force-dynamic";

const CURRENT_ROUND_BASE_ENTRY = 10;
const ROUND_THREE_MINIMUM_PRIZE = 250;

export default async function Home() {
  const [match, upcomingBrazilMatches, rankingPlayers, closedRounds, groupStandings] = await Promise.all([
    getNextMatch(),
    getUpcomingMatches(),
    getRankingPlayers(10),
    getClosedRounds(),
    getGroupStandings("Grupo C")
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

  const publicEntryValue = match.entryValue + match.operationalFee;
  const roundNumber = Math.max(upcomingBrazilMatches.findIndex((item) => item.id === match.id) + 1, 1);
  const currentMinimumPrize = roundNumber === 3 ? ROUND_THREE_MINIMUM_PRIZE : match.guaranteedPrize;
  const currentRoundConfirmedGuesses = match.status === "aberto" ? match.confirmedGuesses : 0;
  const currentRoundPrize = Math.max(
    currentMinimumPrize,
    currentRoundConfirmedGuesses * CURRENT_ROUND_BASE_ENTRY * 0.6
  );
  const socialProofText = currentRoundConfirmedGuesses === 0
    ? "🔥 Seja o primeiro a confirmar seu palpite nesta rodada"
    : currentRoundConfirmedGuesses === 1
      ? "🔥 1 palpite confirmado nesta rodada"
      : `🔥 ${currentRoundConfirmedGuesses} palpites confirmados nesta rodada`;
  const latestClosedRound = closedRounds[0];
  const latestPaidTotal = latestClosedRound?.winners.reduce((total, winner) => total + winner.prizeValue, 0) ?? 0;
  const bettingStatusLabel = match.status === "encerrado"
    ? "encerrado"
    : match.status === "em_andamento"
      ? "palpites em breve"
      : "palpites abertos";
  const roundLabel = match.status === "aberto" ? `Rodada ${roundNumber} aberta` : match.group;
  const nextBrazilMatch = upcomingBrazilMatches.find(
    (nextMatch) => nextMatch.id !== match.id && new Date(nextMatch.startsAt).getTime() > new Date(match.startsAt).getTime()
  );
  const homeFlag = countryFlag(match.homeTeam);
  const awayFlag = countryFlag(match.awayTeam);

  return (
    <>
      {match.status === "aberto" ? <RoundVisitorTracker gameId={match.id} /> : null}
      <section className="stadium-hero">
        <div className="stadium-lights" aria-hidden />
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-5xl flex-col items-center justify-center gap-2 px-4 py-4 text-center text-white md:min-h-[640px] md:gap-3 md:py-6">
          <div className="relative z-10 w-full">
            <p className="mb-1 text-sm font-black uppercase tracking-[0.14em] text-brasil-yellow md:hidden">
              {roundLabel}
            </p>
            <p className="mb-2 hidden text-sm font-black uppercase tracking-[0.14em] text-brasil-yellow md:block">
              {roundLabel}
            </p>
            <h1 className="match-title mx-auto max-w-4xl font-sans text-4xl font-black uppercase leading-[0.98] tracking-wide sm:text-5xl md:text-[3.4rem]">
              <span className="text-brasil-yellow">{homeFlag ? `${homeFlag} ` : ""}{match.homeTeam}</span>
              <span className="mx-2 align-middle text-2xl text-white md:mx-4 md:text-4xl">x</span>
              <span className="text-white">{match.awayTeam}{awayFlag ? ` ${awayFlag}` : ""}</span>
            </h1>
            <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm font-bold text-white/90 sm:text-base">
              <p className="flex items-center gap-1.5">
                <CalendarDays size={18} aria-hidden /> {match.dateLabel}, {match.timeLabel}
              </p>
              <p className="flex items-center gap-1.5 text-white/85">
                <MapPin size={18} aria-hidden /> {match.venue || "A confirmar"}{match.city ? ` – ${match.city}` : ""}
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
            <div className="mx-auto mt-4 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/22 bg-black/28 p-3 text-white shadow-field backdrop-blur">
                <p className="text-xs font-black uppercase text-brasil-yellow">Data do jogo</p>
                <p className="mt-1 text-xl font-black">{match.dateLabel}</p>
              </div>
              <div className="rounded-lg border border-brasil-yellow/45 bg-black/32 p-3 text-white shadow-field backdrop-blur">
                <p className="text-xs font-black uppercase text-brasil-yellow">🏆 Prêmio atual</p>
                <p className="mt-1 text-xl font-black">{currency(currentRoundPrize)}</p>
                <p className="mt-1 text-[11px] font-bold text-white/80">mínimo garantido de {currency(currentMinimumPrize)}</p>
              </div>
              <div className="rounded-lg border border-white/22 bg-black/28 p-3 text-white shadow-field backdrop-blur">
                <p className="text-xs font-black uppercase text-brasil-yellow">💰 Cada palpite</p>
                <p className="mt-1 text-xl font-black">{currency(publicEntryValue)}</p>
              </div>
            </div>
            <div className="mt-4">
              {match.status === "encerrado" ? (
                <div className="inline-flex min-h-14 items-center justify-center rounded-full bg-white/16 px-7 py-3 text-lg font-black text-white shadow-field">
                  Rodada encerrada
                </div>
              ) : (
                <AuthGate redirectTo={`/jogos/${match.id}`}>🔥 ENTRAR NO BOLÃO</AuthGate>
              )}
              <p className="mx-auto mt-2 max-w-sm text-center text-xs font-bold text-white/82">
                Status: {bettingStatusLabel}
              </p>
              {match.status === "aberto" ? (
                <p className="mx-auto mt-2 max-w-lg rounded-full border border-brasil-yellow/40 bg-black/24 px-4 py-2 text-sm font-black text-brasil-yellow shadow-field backdrop-blur">
                  {socialProofText}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 grid w-full max-w-2xl gap-2">
            <div className="rounded-lg border border-white/20 bg-black/28 p-2 shadow-field backdrop-blur md:p-3">
              <MatchCountdown startsAt={match.bettingClosesAt} />
            </div>
            <AnimatedScoreboard
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              scores={match.scoreExamples}
              redirectTo={`/jogos/${match.id}`}
            />
          </div>
        </div>
      </section>

      <PageShell>
        <section className="mb-8">
          <SectionTitle eyebrow="Grupo C" title="🏆 Classificação do Grupo C" />
          <div className="overflow-hidden rounded-lg bg-white shadow-field">
            <div className="grid grid-cols-[72px_1fr_72px] bg-brasil-navy px-4 py-3 text-xs font-black uppercase text-white">
              <span>Posição</span>
              <span>Seleção</span>
              <span className="text-right">Pontos</span>
            </div>
            {groupStandings.map((standing) => (
              <div key={standing.team} className="grid grid-cols-[72px_1fr_72px] items-center border-b border-slate-100 px-4 py-3 font-bold text-slate-700 last:border-0">
                <span className="font-black text-brasil-green">{standing.position}º</span>
                <span className="font-black text-brasil-navy">{countryWithFlag(standing.team)}</span>
                <span className="text-right font-black">{standing.points}</span>
              </div>
            ))}
          </div>
        </section>

        {latestClosedRound ? (
          <section className="mb-8 rounded-lg bg-white p-5 shadow-field md:p-6">
            <p className="mb-4 text-sm font-black uppercase text-brasil-green">🏆 Última rodada</p>
            {latestClosedRound.accumulated ? (
              <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brasil-yellow text-brasil-navy">
                  <Flame size={24} aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-black text-brasil-navy">🔥 Acumulou!</p>
                  <p className="mt-1 font-black text-brasil-green">{latestClosedRound.result}</p>
                  <p className="mt-1 font-semibold text-slate-600">
                    Ninguém acertou o placar exato. A premiação segue acumulada para a próxima rodada.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-[auto_1fr] md:items-center">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-brasil-green text-white">
                  <Trophy size={24} aria-hidden />
                </span>
                <div>
                  <p className="text-2xl font-black text-brasil-navy">🏆 Temos vencedor!</p>
                  <p className="mt-1 font-black text-brasil-green uppercase">Resultado oficial: {latestClosedRound.result}</p>
                  {latestClosedRound.winners.length > 0 ? (
                    <div className="mt-3 grid gap-2 font-semibold text-slate-600">
                      <div>
                        <p className="font-black text-brasil-navy">
                          {latestClosedRound.winners.length > 1 ? "Vencedores:" : "Vencedor:"}
                        </p>
                        {latestClosedRound.winners.map((winner) => (
                          <p key={winner.id} className="font-black uppercase text-brasil-navy">{winner.name}</p>
                        ))}
                      </div>
                      <p>
                        {latestClosedRound.winners.length > 1 ? "Premiação dividida:" : "Premiação paga:"}<br />
                        <span className="font-black text-brasil-green">
                          {latestClosedRound.winners.length > 1
                            ? `${currency(latestClosedRound.winners[0]?.prizeValue ?? 0)} para cada vencedor`
                            : currency(latestPaidTotal)}
                        </span>
                      </p>
                    </div>
                  ) : (
                    <p className="mt-1 font-semibold text-slate-600">Confira os vencedores da rodada.</p>
                  )}
                </div>
              </div>
            )}
          </section>
        ) : null}

        {nextBrazilMatch ? (
          <section>
            <SectionTitle eyebrow="Calendário" title="Próximo jogo após esta rodada" />
            <article className="rounded-lg bg-white p-5 shadow-field md:p-6">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brasil-green">{nextBrazilMatch.group}</p>
              <h2 className="mt-1 text-2xl font-black text-brasil-navy">
                {countryWithFlag(nextBrazilMatch.homeTeam)} x {countryWithFlag(nextBrazilMatch.awayTeam)}
              </h2>
              <div className="mt-3 grid gap-2 text-sm font-bold text-slate-600">
                <p>{nextBrazilMatch.dateLabel}</p>
                <p>{nextBrazilMatch.venue}</p>
                {nextBrazilMatch.city ? <p>{nextBrazilMatch.city}</p> : null}
              </div>
              <p className="mt-4 inline-flex min-h-10 items-center rounded-full bg-brasil-light px-4 text-sm font-black text-brasil-navy">
                Status: Aguardando abertura da rodada
              </p>
            </article>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard icon={Trophy} label="Prêmio atual" value={currency(currentRoundPrize)} tone="yellow" />
          <StatCard icon={Wallet} label="Cada palpite" value={currency(publicEntryValue)} />
          <StatCard icon={Users} label="Palpites nesta rodada" value={`${currentRoundConfirmedGuesses}`} tone="blue" />
        </section>
        <p className="mt-3 rounded-lg bg-white p-4 text-sm font-black text-brasil-navy shadow-field">
          Prêmio atual calculado apenas pela rodada aberta, com mínimo garantido de {currency(currentMinimumPrize)}.
        </p>

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

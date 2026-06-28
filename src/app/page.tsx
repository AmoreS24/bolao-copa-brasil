import { CalendarDays, CircleDollarSign, Clock, Flame, MessageCircle, Trophy, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { getClosedRounds, getHomeSocialProof, getNextMatch, getRankingPlayers, getUpcomingMatches } from "@/data/supabase-live";
import { currency } from "@/lib/utils";
import { countryFlag, countryWithFlag } from "@/lib/countries";
import { MatchCountdown } from "@/components/match-countdown";
import { AnimatedScoreboard } from "@/components/animated-scoreboard";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { RankingList } from "@/components/ranking-list";
import { AuthGate } from "@/components/auth-gate";
import { RoundVisitorTracker } from "@/components/round-visitor-tracker";
import { OFFICIAL_WHATSAPP_GROUP_URL } from "@/lib/support";

export const dynamic = "force-dynamic";

const CURRENT_ROUND_BASE_ENTRY = 10;
const ROUND_THREE_MINIMUM_PRIZE = 250;
const ROUND_GUESS_GOAL = 50;
const PUBLIC_PRIZES_PAID_TOTAL = 700;
const KNOCKOUT_STAGE_LABEL = "Mata-mata • 16 avos de final";
const CURRENT_PUBLIC_ROUND = {
  homeTeam: "Brasil",
  awayTeam: "Japão",
  startsAt: "2026-06-29T14:00:00-03:00",
  bettingClosesAt: "2026-06-29T13:45:00-03:00",
  dateLabel: "29/06/2026",
  timeLabel: "14:00",
  bettingClosesLabel: "13:45",
  venue: "",
  city: "",
  group: KNOCKOUT_STAGE_LABEL,
  status: "aberto" as const,
  guaranteedPrize: ROUND_THREE_MINIMUM_PRIZE,
  entryValue: 10,
  operationalFee: 1.99,
  scoreExamples: Array.from({ length: 24 }, (_, index) => ({
    brazil: index % 6,
    opponent: Math.floor(index / 2) % 4
  }))
};
const KNOCKOUT_PATH = [
  { stage: "16 avos de final", date: "29/06", time: "14h", match: "Brasil x Japão", home: "Brasil", away: "Japão", current: true },
  { stage: "Oitavas de final", date: "05/07", time: "17h", match: "A definir", home: "", away: "", current: false },
  { stage: "Quartas de final", date: "11/07", time: "18h", match: "A definir", home: "", away: "", current: false },
  { stage: "Semifinal", date: "15/07", time: "16h", match: "A definir", home: "", away: "", current: false },
  { stage: "Final", date: "19/07", time: "16h", match: "A definir", home: "", away: "", current: false }
];

export default async function Home() {
  const [match, upcomingBrazilMatches, rankingPlayers, closedRounds] = await Promise.all([
    getNextMatch(),
    getUpcomingMatches(),
    getRankingPlayers(10),
    getClosedRounds()
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

  const homeSocialProof = await getHomeSocialProof(match.id);
  const displayMatch: typeof match = {
    ...match,
    ...CURRENT_PUBLIC_ROUND,
    exactPool: ROUND_THREE_MINIMUM_PRIZE,
    displayedPrizeTotal: ROUND_THREE_MINIMUM_PRIZE,
    confirmedGuesses: match.status === "aberto" ? match.confirmedGuesses : 0
  };

  const publicEntryValue = displayMatch.entryValue + displayMatch.operationalFee;
  const currentMinimumPrize = ROUND_THREE_MINIMUM_PRIZE;
  const currentRoundConfirmedGuesses = displayMatch.status === "aberto" ? displayMatch.confirmedGuesses : 0;
  const currentRoundPrize = Math.max(
    currentMinimumPrize,
    currentRoundConfirmedGuesses * CURRENT_ROUND_BASE_ENTRY * 0.6
  );
  const socialProofText = currentRoundConfirmedGuesses === 0
    ? "🔥 Seja o primeiro a confirmar seu palpite nesta rodada"
    : currentRoundConfirmedGuesses === 1
      ? "🔥 1 palpite confirmado nesta rodada"
      : `🔥 ${currentRoundConfirmedGuesses} palpites confirmados nesta rodada`;
  const goalProgress = Math.min(100, Math.round((currentRoundConfirmedGuesses / ROUND_GUESS_GOAL) * 100));
  const goalReached = currentRoundConfirmedGuesses >= ROUND_GUESS_GOAL;
  const latestClosedRound = closedRounds[0];
  const latestPaidTotal = latestClosedRound?.winners.reduce((total, winner) => total + winner.prizeValue, 0) ?? 0;
  const bettingStatusLabel = displayMatch.status === "encerrado"
    ? "encerrado"
    : displayMatch.status === "em_andamento"
      ? "palpites em breve"
      : "palpites abertos";
  const roundLabel = KNOCKOUT_STAGE_LABEL;
  const nextBrazilMatch = upcomingBrazilMatches.find(
    (nextMatch) => nextMatch.id !== match.id && new Date(nextMatch.startsAt).getTime() > new Date(displayMatch.startsAt).getTime()
  );
  const homeFlag = countryFlag(displayMatch.homeTeam);
  const awayFlag = countryFlag(displayMatch.awayTeam);

  return (
    <>
      {displayMatch.status === "aberto" ? <RoundVisitorTracker gameId={match.id} /> : null}
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
              <span className="text-brasil-yellow">{homeFlag ? `${homeFlag} ` : ""}{displayMatch.homeTeam}</span>
              <span className="mx-2 align-middle text-2xl text-white md:mx-4 md:text-4xl">x</span>
              <span className="text-white">{displayMatch.awayTeam}{awayFlag ? ` ${awayFlag}` : ""}</span>
            </h1>
            <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm font-bold text-white/90 sm:text-base">
              <p className="flex items-center gap-1.5">
                <CalendarDays size={18} aria-hidden /> {displayMatch.dateLabel}, {displayMatch.timeLabel}
              </p>
              <p className="flex items-center gap-1.5">
                <Trophy size={18} className="text-brasil-yellow" aria-hidden /> {displayMatch.competition}
              </p>
              <p className="flex items-center gap-1.5 text-white/85">
                <Users size={18} className="text-brasil-yellow" aria-hidden /> {displayMatch.group}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock size={18} className="text-brasil-yellow" aria-hidden /> Palpites até {displayMatch.bettingClosesLabel}
              </p>
            </div>
            <div className="mx-auto mt-4 grid w-full max-w-2xl gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-white/22 bg-black/28 p-3 text-white shadow-field backdrop-blur">
                <p className="text-xs font-black uppercase text-brasil-yellow">Data do jogo</p>
                <p className="mt-1 text-xl font-black">{displayMatch.dateLabel}</p>
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
            <div className="mx-auto mt-3 flex max-w-2xl flex-col items-center justify-between gap-3 rounded-lg border border-brasil-yellow/45 bg-white/12 px-4 py-3 text-white shadow-field backdrop-blur sm:flex-row">
              <p className="text-center text-sm font-black sm:text-left">🏆 Já pagamos R$ 700,00 em premiações nesta Copa!</p>
              <Link
                href="/vencedores"
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-full bg-brasil-yellow px-4 text-sm font-black text-brasil-navy shadow-field"
              >
                Ver vencedores
              </Link>
            </div>
            <div className="mt-4">
              {displayMatch.status === "encerrado" ? (
                <div className="inline-flex min-h-14 items-center justify-center rounded-full bg-white/16 px-7 py-3 text-lg font-black text-white shadow-field">
                  Rodada encerrada
                </div>
              ) : (
                <AuthGate redirectTo={`/jogos/${match.id}`}>🔥 ENTRAR NO BOLÃO</AuthGate>
              )}
              <p className="mx-auto mt-2 max-w-sm text-center text-xs font-bold text-white/82">
                Status: {bettingStatusLabel}
              </p>
              {displayMatch.status === "aberto" ? (
                <div className="mx-auto mt-2 grid max-w-lg gap-2">
                  <p className="rounded-full border border-brasil-yellow/40 bg-black/24 px-4 py-2 text-sm font-black text-brasil-yellow shadow-field backdrop-blur">
                    {socialProofText}
                  </p>
                  <div className="rounded-lg border border-white/20 bg-black/28 px-4 py-3 text-left shadow-field backdrop-blur">
                    <div className="flex items-center justify-between gap-3 text-xs font-black uppercase text-white">
                      <span>🎯 Meta da Rodada</span>
                      <span>{goalReached ? "Meta batida!" : `${goalProgress}%`}</span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-white/85">
                      {currentRoundConfirmedGuesses} de {ROUND_GUESS_GOAL} palpites confirmados
                    </p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                      <div className="h-full rounded-full bg-brasil-yellow transition-[width]" style={{ width: `${goalProgress}%` }} />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="relative z-10 grid w-full max-w-2xl gap-2">
            <div className="rounded-lg border border-white/20 bg-black/28 p-2 shadow-field backdrop-blur md:p-3">
              <MatchCountdown startsAt={displayMatch.bettingClosesAt} />
            </div>
            <AnimatedScoreboard
              homeTeam={displayMatch.homeTeam}
              awayTeam={displayMatch.awayTeam}
              scores={displayMatch.scoreExamples}
              redirectTo={`/jogos/${match.id}`}
            />
          </div>
        </div>
      </section>

      <PageShell>
        <section className="mb-8">
          <SectionTitle eyebrow="Mata-mata" title="Caminho do Brasil no mata-mata" />
          <div className="grid gap-3 md:grid-cols-5">
            {KNOCKOUT_PATH.map((round) => {
              const roundHomeFlag = round.home ? countryFlag(round.home) : "";
              const roundAwayFlag = round.away ? countryFlag(round.away) : "";

              return (
                <article
                  key={round.stage}
                  className={`rounded-lg p-4 shadow-field ${round.current ? "bg-brasil-navy text-white" : "bg-white text-slate-700"}`}
                >
                  <p className={`text-xs font-black uppercase ${round.current ? "text-brasil-yellow" : "text-brasil-green"}`}>
                    {round.stage}
                  </p>
                  <p className="mt-2 text-lg font-black">
                    {roundHomeFlag ? `${roundHomeFlag} ` : ""}{round.match}{roundAwayFlag ? ` ${roundAwayFlag}` : ""}
                  </p>
                  <p className={`mt-3 text-sm font-bold ${round.current ? "text-white/82" : "text-slate-500"}`}>
                    {round.date} • {round.time}
                  </p>
                </article>
              );
            })}
          </div>
          <p className="mt-3 rounded-lg bg-white p-4 text-sm font-bold text-slate-600 shadow-field">
            Datas e horários condicionados ao avanço da Seleção.
          </p>
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
              </div>
              <p className="mt-4 inline-flex min-h-10 items-center rounded-full bg-brasil-light px-4 text-sm font-black text-brasil-navy">
                Status: Aguardando abertura da rodada
              </p>
            </article>
          </section>
        ) : null}

        <section className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Trophy} label="Prêmio atual" value={currency(currentRoundPrize)} tone="yellow" />
          <StatCard icon={Wallet} label="Cada palpite" value={currency(publicEntryValue)} />
          <StatCard icon={Users} label="Palpites nesta rodada" value={`${currentRoundConfirmedGuesses}`} tone="blue" />
          <StatCard icon={CircleDollarSign} label="Prêmios já pagos" value={currency(PUBLIC_PRIZES_PAID_TOTAL)} />
        </section>
        <p className="mt-3 rounded-lg bg-white p-4 text-sm font-black text-brasil-navy shadow-field">
          Prêmio atual calculado apenas pela rodada aberta, com mínimo garantido de {currency(currentMinimumPrize)}.
        </p>

        <a
          href={OFFICIAL_WHATSAPP_GROUP_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1f9d55] px-5 text-center font-black text-white shadow-field sm:w-auto"
        >
          <MessageCircle size={20} aria-hidden />
          Grupo Oficial do WhatsApp
        </a>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-field md:p-6">
          <h2 className="text-xl font-black text-brasil-navy">Últimos participantes</h2>
          <p className="mt-1 text-sm font-semibold text-slate-600">Palpites confirmados na rodada atual.</p>
          {homeSocialProof.latestParticipants.length > 0 ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {homeSocialProof.latestParticipants.map((participant) => (
                <div key={participant.id} className="rounded-lg bg-brasil-light p-4">
                  <p className="font-black text-brasil-navy">{participant.name}</p>
                  <p className="mt-1 text-xs font-bold uppercase text-brasil-green">Palpite confirmado</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-lg bg-brasil-light p-4 font-bold text-slate-600">
              Seja o primeiro participante confirmado desta rodada.
            </p>
          )}
        </section>

        <section className="mt-6 rounded-lg bg-white p-5 shadow-field md:p-6">
          <h2 className="text-xl font-black text-brasil-navy">💰 Simulação da premiação</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ["Prêmio atual", currentRoundPrize],
              ["Com 50 palpites", Math.max(currentMinimumPrize, 50 * CURRENT_ROUND_BASE_ENTRY * 0.6)],
              ["Com 100 palpites", Math.max(currentMinimumPrize, 100 * CURRENT_ROUND_BASE_ENTRY * 0.6)]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg bg-brasil-light p-4">
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-brasil-green">{currency(Number(value))}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-8 md:grid-cols-[0.95fr_1.05fr] md:items-start">
          <div>
            <SectionTitle eyebrow="Ranking da Torcida Brasileira" title="Você também concorre no ranking" />
            <p className="rounded-lg bg-white p-5 text-base font-semibold leading-relaxed text-slate-600 shadow-field">
              Depois do Pix aprovado em {displayMatch.homeTeam} x {displayMatch.awayTeam}, você pode registrar 1 voto no
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

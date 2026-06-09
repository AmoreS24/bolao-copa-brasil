import { notFound } from "next/navigation";
import { CalendarDays, CircleDollarSign, Clock, MapPin, Trophy, Users } from "lucide-react";
import { getMatchById } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { currency } from "@/lib/utils";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { PredictionBuilder } from "@/components/prediction-builder";
import { AuthGate } from "@/components/auth-gate";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: { id: string } }) {
  const [match, user] = await Promise.all([getMatchById(params.id), getCurrentUser()]);

  if (!match) {
    notFound();
  }

  const estimatedPrize = match.exactPool;
  const publicEntryValue = match.entryValue + match.operationalFee;

  return (
    <PageShell>
      <section className="rounded-lg bg-white p-5 shadow-field md:p-7">
        <div className="grid gap-6 md:grid-cols-[1fr_0.9fr] md:items-center">
          <div>
            <p className="font-black uppercase text-brasil-green">Palpite Agora</p>
            <p className="mt-2 text-lg font-black text-brasil-navy">
              {user ? `Bem-vindo, ${user.nome}` : "Entre para fazer seu palpite"}
            </p>
            <h1 className="mt-1 text-4xl font-black text-brasil-navy">
              {match.homeTeam} x {match.awayTeam}
            </h1>
            <div className="mt-4 grid gap-2 font-bold text-slate-600">
              <p className="flex items-center gap-2">
                <CalendarDays size={18} aria-hidden /> {match.dateLabel}, {match.timeLabel}
              </p>
              <p className="flex items-center gap-2">
                <MapPin size={18} aria-hidden /> {match.venue}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={CircleDollarSign} label="Cada palpite" value={currency(publicEntryValue)} />
            <StatCard icon={Trophy} label="Prêmio estimado" value={currency(estimatedPrize)} tone="yellow" />
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-8 md:grid-cols-[1fr_0.85fr]">
        <div className="rounded-lg bg-white p-5 shadow-field md:p-7">
          <SectionTitle eyebrow="Placar exato" title="Escolha seu(s) placar(es)" />
          {user ? (
            <PredictionBuilder
              matchId={match.id}
              homeTeam={match.homeTeam}
              awayTeam={match.awayTeam}
              entryValue={match.entryValue}
              operationalFee={match.operationalFee}
            />
          ) : (
            <div className="grid gap-4 rounded-lg bg-brasil-light p-5">
              <p className="font-semibold text-slate-700">
                Antes de escolher seu placar, faça login ou crie seu cadastro.
              </p>
              <AuthGate redirectTo={`/jogos/${match.id}`}>Entrar para palpitar</AuthGate>
            </div>
          )}
        </div>

        <aside className="rounded-lg bg-brasil-navy p-5 text-white shadow-field md:p-7">
          <Trophy className="mb-4 text-brasil-yellow" size={32} aria-hidden />
          <h2 className="text-2xl font-black">Acumulado no topo</h2>
          <p className="mt-2 text-3xl font-black text-brasil-yellow">{currency(match.exactPool)}</p>
          <div className="mt-5 grid gap-3">
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm font-black uppercase text-brasil-yellow">Escassez</p>
              <p className="mt-1 text-xl font-black">{match.confirmedGuesses} palpites confirmados</p>
              <p className="mt-1 font-semibold text-white/80">Últimos {match.spotsLeft} lugares disponíveis</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm font-black uppercase text-brasil-yellow">Fechamento</p>
              <p className="mt-1 flex items-center gap-2 font-black">
                <Clock size={18} aria-hidden /> Apostas até {match.bettingClosesLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/80">15 minutos antes da partida.</p>
            </div>
            <div className="rounded-lg bg-white/10 p-4">
              <p className="text-sm font-black uppercase text-brasil-yellow">Ranking da torcida</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white/85">
                <Users size={18} aria-hidden /> 1 participação por usuário neste jogo após o Pix aprovado.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </PageShell>
  );
}

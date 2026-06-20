import { Flame, Trophy } from "lucide-react";
import { PageShell, SectionTitle } from "@/components/ui";
import { getClosedRounds, getHallOfFame } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function WinnersPage() {
  const [rounds, hallOfFame] = await Promise.all([getClosedRounds(), getHallOfFame()]);

  return (
    <PageShell>
      <div className="mb-6">
        <p className="font-black uppercase text-brasil-green">Resultados</p>
        <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Vencedores</h1>
        <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-slate-600">
          Confira os ganhadores e resultados das rodadas anteriores.
        </p>
      </div>

      <section className="mb-8">
        <SectionTitle eyebrow="Campeões" title="🏆 Hall da Fama" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          <div className="grid grid-cols-[1fr_90px_130px] bg-brasil-navy px-4 py-3 text-xs font-black uppercase text-white">
            <span>Nome</span>
            <span className="text-center">Acertos</span>
            <span className="text-right">Total recebido</span>
          </div>
          {hallOfFame.map((player) => (
            <div key={player.id} className="grid grid-cols-[1fr_90px_130px] items-center border-b border-slate-100 px-4 py-3 text-sm font-bold text-slate-700 last:border-0">
              <span className="font-black text-brasil-navy">{player.name}</span>
              <span className="text-center font-black text-brasil-green">{player.wins}</span>
              <span className="text-right font-black text-brasil-green">{currency(player.totalPrizes)}</span>
            </div>
          ))}
          {hallOfFame.length === 0 ? (
            <p className="p-4 font-semibold text-slate-600">O Hall da Fama será preenchido após a primeira premiação.</p>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4">
        {rounds.map((round) => (
          <article key={round.id} className="rounded-lg bg-white p-5 shadow-field md:p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-sm font-black uppercase text-brasil-green">{round.dateLabel || "Rodada encerrada"}</p>
                <h2 className="mt-1 text-2xl font-black text-brasil-navy">{round.match}</h2>
                <p className="mt-2 font-semibold text-slate-600">Resultado oficial: {round.result}</p>
              </div>
              <span className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-black ${
                round.accumulated ? "bg-brasil-yellow text-brasil-navy" : "bg-brasil-green text-white"
              }`}>
                {round.accumulated ? <Flame size={17} aria-hidden /> : <Trophy size={17} aria-hidden />}
                {round.statusLabel}
              </span>
            </div>

            {round.winners.length > 0 ? (
              <div className="mt-5 grid gap-3">
                {round.winners.map((winner) => (
                  <div key={winner.id} className="grid gap-2 rounded-lg bg-brasil-light p-4 md:grid-cols-4 md:items-center">
                    <p className="font-black text-brasil-navy">{winner.name}</p>
                    <p className="font-semibold text-slate-600">{winner.maskedPhone}</p>
                    <p className="font-semibold text-slate-600">Palpite vencedor: {winner.guess}</p>
                    <p className="font-black text-brasil-green">{currency(winner.prizeValue)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-brasil-light p-4 font-black text-brasil-navy">
                🔥 Acumulou para a próxima rodada.
              </p>
            )}
          </article>
        ))}

        {rounds.length === 0 ? (
          <div className="rounded-lg bg-white p-5 font-semibold text-slate-600 shadow-field">
            Nenhuma rodada encerrada ainda.
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}

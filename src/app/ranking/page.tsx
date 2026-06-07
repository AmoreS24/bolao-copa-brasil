import { CheckCircle2, Medal, Trophy } from "lucide-react";
import { RankingList } from "@/components/ranking-list";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { platformStats, ranking } from "@/data/mock";
import { currency } from "@/lib/utils";

export default function RankingPage() {
  return (
    <PageShell>
      <div className="mb-6">
        <p className="font-black uppercase text-brasil-green">Ranking da Torcida Brasileira</p>
        <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Disputa acumulada ate o ultimo jogo do Brasil</h1>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Trophy} label="Acumulado do ranking" value={currency(platformStats.rankingPool)} tone="yellow" />
        {ranking.slice(0, 3).map((player) => (
          <StatCard
            key={player.position}
            icon={Medal}
            label={`${player.position}o lugar`}
            value={`${player.points} pts`}
            tone={player.position === 1 ? "green" : "blue"}
          />
        ))}
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Top 10" title="Classificacao geral" />
        <RankingList />
      </section>
      <section className="mt-8 rounded-lg bg-white p-5 shadow-field">
        <SectionTitle eyebrow="Voto da torcida" title="Participacao liberada apos pagamento" />
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Seu voto neste jogo
            <select className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 text-brasil-navy shadow-field outline-none focus:border-brasil-green">
              <option>Brasil vence</option>
              <option>Empate</option>
              <option>Marrocos vence</option>
            </select>
          </label>
          <button className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field">
            <CheckCircle2 size={19} aria-hidden />
            Registrar voto
          </button>
        </div>
        <p className="mt-3 text-sm font-semibold text-slate-600">
          Limite do MVP: 1 participacao por usuario por jogo, independente da quantidade de palpites pagos.
        </p>
      </section>
      <section className="mt-8 rounded-lg bg-white p-5 shadow-field">
        <h2 className="text-xl font-black text-brasil-navy">Distribuicao sugerida do premio</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <p className="rounded-lg bg-brasil-light p-4 font-black text-brasil-green">1o lugar: 60%</p>
          <p className="rounded-lg bg-brasil-light p-4 font-black text-brasil-blue">2o lugar: 30%</p>
          <p className="rounded-lg bg-brasil-light p-4 font-black text-brasil-navy">3o lugar: 10%</p>
        </div>
      </section>
    </PageShell>
  );
}

import { Award, Banknote, ChartNoAxesColumnIncreasing, Percent, Target, Trophy, Users, Wallet } from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { PageShell, PrimaryLink, SectionTitle, StatCard } from "@/components/ui";
import { getParticipantPerformance } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PerformancePage() {
  const performance = await getParticipantPerformance();

  if (!performance) {
    return (
      <PageShell>
        <section className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-field">
          <SectionTitle eyebrow="Meu desempenho" title="Entre para acompanhar seus números" />
          <p className="mb-5 font-semibold leading-relaxed text-slate-600">
            Faça login para visualizar suas estatísticas individuais no Bolão Jogos do Brasil.
          </p>
          <AuthGate redirectTo="/dashboard/desempenho">Entrar</AuthGate>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase text-brasil-green">Meu desempenho</p>
          <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">{performance.name}</h1>
          <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-slate-600">
            Acompanhe seus resultados, investimento e desempenho no Ranking da Torcida.
          </p>
        </div>
        <PrimaryLink href="/dashboard">Voltar aos meus palpites</PrimaryLink>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Rodadas disputadas" value={`${performance.roundsPlayed}`} />
        <StatCard icon={Target} label="Palpites confirmados" value={`${performance.confirmedGuesses}`} tone="blue" />
        <StatCard icon={Trophy} label="Palpites vencedores" value={`${performance.winningGuesses}`} tone="yellow" />
        <StatCard icon={Wallet} label="Total investido" value={currency(performance.totalInvested)} />
        <StatCard icon={Banknote} label="Total recebido em prêmios" value={currency(performance.totalPrizesReceived)} tone="yellow" />
        <StatCard icon={Award} label="Melhor pontuação no Ranking" value={`${performance.bestRankingScore} pts`} tone="blue" />
        <StatCard icon={Percent} label="Aproveitamento" value={`${performance.successRate}%`} />
        <StatCard icon={ChartNoAxesColumnIncreasing} label="Saldo em prêmios" value={currency(performance.totalPrizesReceived - performance.totalInvested)} tone="blue" />
      </section>

      <section className="mt-8 rounded-lg bg-white p-5 shadow-field">
        <h2 className="text-xl font-black text-brasil-navy">Resumo</h2>
        <p className="mt-2 font-semibold leading-relaxed text-slate-600">
          O aproveitamento considera seus palpites vencedores sobre o total de palpites confirmados. Os valores exibidos
          usam apenas pagamentos e prêmios vinculados ao seu usuário.
        </p>
      </section>
    </PageShell>
  );
}

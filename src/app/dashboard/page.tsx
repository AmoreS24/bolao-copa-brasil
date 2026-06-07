import { Flag, Goal, Trophy, Users } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { PageShell, PrimaryLink, SectionTitle, StatCard } from "@/components/ui";
import { matches, platformStats, userHistory } from "@/data/mock";
import { nextBrazilMatch } from "@/data/next-match";
import { currency } from "@/lib/utils";

export default function DashboardPage() {
  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase text-brasil-green">Dashboard do usuario</p>
          <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Ola, Erick</h1>
        </div>
        <PrimaryLink href={`/jogos/${nextBrazilMatch.id}`}>Participar do proximo jogo</PrimaryLink>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Goal} label="Placar Exato" value={currency(platformStats.exactPool)} />
        <StatCard icon={Trophy} label="Ranking" value={currency(platformStats.rankingPool)} tone="yellow" />
        <StatCard icon={Users} label="Sua posicao" value="12o" tone="blue" />
        <StatCard icon={Flag} label="Palpites enviados" value="3" />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Rodadas" title="Proximos jogos do Brasil" />
        <div className="grid gap-4 md:grid-cols-3">
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Historico" title="Jogos em que participou" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {userHistory.map((item) => (
            <div key={item.match} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-4">
              <p className="font-black text-brasil-navy">{item.match}</p>
              <p className="font-semibold text-slate-600">Palpite: {item.guess}</p>
              <p className="font-semibold text-slate-600">{item.points} pontos</p>
              <p className="font-black text-brasil-green">{item.status}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

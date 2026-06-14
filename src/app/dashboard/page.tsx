import { Flag, Goal, Trophy, Users } from "lucide-react";
import { MatchCard } from "@/components/match-card";
import { PageShell, PrimaryLink, SectionTitle, StatCard } from "@/components/ui";
import { getProfileSummary, getUpcomingMatches, getPrizeValue } from "@/data/supabase-live";
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
  const [matches, prize, profile] = await Promise.all([
    getUpcomingMatches(),
    getPrizeValue(),
    getProfileSummary()
  ]);
  const nextMatch = matches[0];

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
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Goal} label="Prêmio garantido" value={currency(prize)} />
        <StatCard icon={Trophy} label="Ranking" value={currency(nextMatch?.rankingPool ?? 0)} tone="yellow" />
        <StatCard icon={Users} label="Sua posicao" value="-" tone="blue" />
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
        <SectionTitle eyebrow="Historico" title="Jogos em que participou" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {profile.history.map((item, index) => (
            <div key={`${item.match}-${item.guess}-${index}`} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-4">
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
          ))}
          {profile.history.length === 0 ? (
            <div className="p-4 font-semibold text-slate-600">Nenhum palpite encontrado no Supabase.</div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

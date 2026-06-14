import { CheckCircle2, Medal, Trophy } from "lucide-react";
import { RankingList } from "@/components/ranking-list";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { getNextMatch, getRankingPlayers, getRankingRoundDetails } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function RankingPage() {
  const [ranking, match, roundDetails] = await Promise.all([
    getRankingPlayers(10),
    getNextMatch(),
    getRankingRoundDetails(30)
  ]);
  const user = getCurrentUser();
  const supabase = getSupabaseServerClient();
  const { data: existingVote } = user && match && supabase
    ? await supabase
      .from("torcida_votos")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("jogo_id", match.id)
      .maybeSingle()
    : { data: null };

  return (
    <PageShell>
      <div className="mb-6">
        <p className="font-black uppercase text-brasil-green">Ranking da Torcida Brasileira</p>
        <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Ranking da Torcida Brasileira</h1>
        <p className="mt-2 max-w-3xl font-semibold leading-relaxed text-slate-600">
          A cada jogo do Brasil você pode somar pontos respondendo perguntas extras após confirmar seu palpite.
          Cada jogo vale até 30 pontos.
        </p>
      </div>
      <section className="mb-8 rounded-lg bg-brasil-navy p-5 text-white shadow-field">
        <p className="text-sm font-black uppercase text-brasil-yellow">Premiação</p>
        <p className="mt-2 text-xl font-black leading-relaxed">
          10% de todo o valor arrecadado será destinado aos vencedores do Ranking da Torcida.
        </p>
      </section>
      <section className="grid gap-4 md:grid-cols-3">
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
        <SectionTitle eyebrow="Top 10" title="Top 10 da Torcida Brasileira" />
        <RankingList players={ranking} limit={10} />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Rodadas apuradas" title="Detalhamento da pontuação" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {roundDetails.map((detail) => (
            <div key={detail.id} className="grid gap-3 border-b border-slate-100 p-4 last:border-0">
              <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-black text-brasil-navy">{detail.name}</p>
                  <p className="text-sm font-semibold text-slate-500">{detail.match} {detail.dateLabel ? `| ${detail.dateLabel}` : ""}</p>
                </div>
                <p className="text-lg font-black text-brasil-blue">{detail.total} pts</p>
              </div>
              <div className="grid gap-2 text-xs font-bold text-slate-600 sm:grid-cols-5">
                <span>Resultado: {detail.resultado}</span>
                <span>Gols: {detail.gols}</span>
                <span>Primeiro gol: {detail.primeiroGol}</span>
                <span>Escanteios: {detail.escanteios}</span>
                <span>Cartões: {detail.cartoes}</span>
              </div>
            </div>
          ))}
          {roundDetails.length === 0 ? (
            <div className="p-4 font-semibold text-slate-600">Nenhuma rodada apurada ainda.</div>
          ) : null}
        </div>
      </section>
      <section className="mt-8 rounded-lg border border-brasil-green/25 bg-white p-5 shadow-field">
        <SectionTitle eyebrow="Voto da torcida" title="Registre seu voto" />
        <p className="font-semibold leading-relaxed text-slate-600">
          Após confirmar seu palpite, responda às 5 perguntas bônus e ative sua participação no Ranking da Torcida.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field">
            <CheckCircle2 size={19} aria-hidden />
            Participação após pagamento confirmado
          </span>
          {existingVote ? (
            <p className="rounded-lg bg-brasil-light px-4 py-3 font-black text-brasil-green">
              Você já ativou sua participação neste jogo.
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-8 max-w-2xl rounded-lg bg-white p-4 shadow-field">
        <h2 className="text-lg font-black text-brasil-navy">Distribuição da premiação</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          <p className="rounded-lg bg-brasil-light p-3 font-black text-brasil-green">1º lugar: 60%</p>
          <p className="rounded-lg bg-brasil-light p-3 font-black text-brasil-blue">2º lugar: 30%</p>
          <p className="rounded-lg bg-brasil-light p-3 font-black text-brasil-navy">3º lugar: 10%</p>
        </div>
      </section>
    </PageShell>
  );
}

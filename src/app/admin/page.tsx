import { Banknote, CheckCircle2, Clock, Edit3, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { currency } from "@/lib/utils";
import { matches, platformStats } from "@/data/mock";

export default function AdminPage() {
  const adminActions: Array<[string, LucideIcon]> = [
    ["Monitorar Pix Asaas pendentes", Clock],
    ["Confirmar palpites pagos automaticamente", CheckCircle2],
    ["Atualizar acumulado exibido no topo", Edit3],
    ["Encerrar rodada e calcular premios", Trophy]
  ];

  return (
    <PageShell>
      <div className="mb-6">
        <p className="font-black uppercase text-brasil-green">Painel administrativo</p>
        <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Controle inicial do MVP</h1>
      </div>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard icon={Users} label="Usuarios" value="128" />
        <StatCard icon={Banknote} label="Arrecadado" value={currency(24800)} tone="yellow" />
        <StatCard icon={Clock} label="Pix pendentes" value="18" tone="blue" />
        <StatCard icon={Trophy} label="Ranking" value={currency(platformStats.rankingPool)} />
      </section>
      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Rodadas" title="Jogos cadastrados" />
          <div className="grid gap-3">
            {matches.map((match) => (
              <div key={match.id} className="rounded-lg bg-white p-4 shadow-field">
                <p className="font-black text-brasil-navy">{match.brazil} x {match.opponent}</p>
                <p className="text-sm font-semibold text-slate-600">{match.date}, {match.time}</p>
                <p className="mt-2 font-black text-brasil-green">Entrada: {currency(match.entry)}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="Acumulado" title="Atualizacao manual" />
          <div className="mb-6 rounded-lg bg-white p-4 shadow-field">
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Premio exibido no topo
              <input
                defaultValue={currency(platformStats.exactPool)}
                className="min-h-12 rounded-lg border border-slate-200 px-4 text-xl font-black text-brasil-green outline-none focus:border-brasil-green"
              />
            </label>
            <button className="mt-3 min-h-11 rounded-full bg-brasil-green px-5 font-black text-white shadow-field">
              Salvar acumulado
            </button>
          </div>
          <SectionTitle eyebrow="Operacao" title="Acoes manuais previstas" />
          <div className="grid gap-3">
            {adminActions.map(([label, Icon]) => (
              <div key={label} className="flex items-center gap-3 rounded-lg bg-white p-4 font-black text-brasil-navy shadow-field">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brasil-yellow text-brasil-blue">
                  <Icon size={20} aria-hidden />
                </span>
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

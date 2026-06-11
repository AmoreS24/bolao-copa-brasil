import { Banknote, CheckCircle2, Clock, Edit3, Percent, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { ManualPaymentConfirmButton } from "@/components/manual-payment-confirm-button";
import { currency } from "@/lib/utils";
import { getAdminStats, type AdminBetFilter } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Confirmado",
    paid: "Pago",
    received: "Recebido",
    PAYMENT_RECEIVED: "Recebido",
    pending_payment: "Aguardando pagamento",
    pending: "Pendente",
    aguardando_pagamento: "Aguardando pagamento"
  };

  return labels[status] ?? status;
}

function normalizeFilter(value?: string): AdminBetFilter {
  return value === "confirmados" || value === "pendentes" ? value : "todos";
}

export default async function AdminPage({ searchParams }: { searchParams?: { filtro?: string } }) {
  const user = getCurrentUser();
  const isMaster = isMasterUser(user);

  if (!isMaster) {
    return (
      <PageShell>
        <section className="rounded-lg bg-white p-6 shadow-field">
          <SectionTitle eyebrow="Admin" title="Acesso restrito" />
          <p className="font-semibold text-slate-600">Esta área é exclusiva para o usuário master.</p>
        </section>
      </PageShell>
    );
  }

  const stats = await getAdminStats();
  const activeFilter = normalizeFilter(searchParams?.filtro);
  const filteredBets = activeFilter === "todos"
    ? stats.bets
    : stats.bets.filter((bet) => bet.filterStatus === activeFilter);
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
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Usuarios" value={`${stats.users}`} />
        <StatCard icon={Banknote} label="Arrecadado" value={currency(stats.paidTotal)} tone="yellow" />
        <StatCard icon={Clock} label="Pix pendentes" value={`${stats.paymentsPending}`} tone="blue" />
        <StatCard icon={Trophy} label="Prêmio garantido" value={currency(stats.prize)} />
        <div className="rounded-lg bg-white p-4 shadow-field">
          <div className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-brasil-green text-white">
            <Percent size={22} aria-hidden />
          </div>
          <p className="text-sm font-bold text-slate-500">Conversão</p>
          <p className="mt-1 text-2xl font-black text-brasil-navy">{stats.conversionRate}%</p>
          <div className="mt-3 grid gap-1 text-xs font-bold text-slate-600">
            <p>Usuários cadastrados: {stats.users}</p>
            <p>Pagamentos confirmados: {stats.paymentsConfirmed}</p>
            <p>Pix pendentes: {stats.paymentsPending}</p>
          </div>
        </div>
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Divulgação" title="Top Afiliados" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          <div className="overflow-x-auto">
            <table className="min-w-[680px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Origem/ref</th>
                  <th className="px-4 py-3">Cadastros</th>
                  <th className="px-4 py-3">Pagamentos confirmados</th>
                  <th className="px-4 py-3">Valor arrecadado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.topAffiliates.map((affiliate) => (
                  <tr key={affiliate.originRef} className="font-semibold text-slate-700">
                    <td className="px-4 py-3 font-black text-brasil-navy">{affiliate.originRef}</td>
                    <td className="px-4 py-3">{affiliate.signups}</td>
                    <td className="px-4 py-3">{affiliate.confirmedPayments}</td>
                    <td className="px-4 py-3 font-black text-brasil-green">{currency(affiliate.paidTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.topAffiliates.length === 0 ? (
            <div className="p-5 font-semibold text-slate-600">Nenhuma origem/ref com cadastro ou pagamento confirmado.</div>
          ) : null}
        </div>
      </section>
      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionTitle eyebrow="Operação" title="Apostas realizadas" />
          <div className="flex flex-wrap gap-2">
            {[
              ["Todos", "todos"],
              ["Confirmados", "confirmados"],
              ["Pendentes", "pendentes"]
            ].map(([label, value]) => {
              const selected = activeFilter === value;

              return (
                <Link
                  key={value}
                  href={value === "todos" ? "/admin" : `/admin?filtro=${value}`}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-black shadow-field ${
                    selected ? "bg-brasil-green text-white" : "bg-white text-brasil-navy"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-field">
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Usuário</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Origem/ref</th>
                  <th className="px-4 py-3">Jogo</th>
                  <th className="px-4 py-3">Placar</th>
                  <th className="px-4 py-3">Aposta</th>
                  <th className="px-4 py-3">Pagamento</th>
                  <th className="px-4 py-3">Valor pago</th>
                  <th className="px-4 py-3">Data/hora</th>
                  <th className="px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBets.map((bet) => (
                  <tr key={bet.id} className="font-semibold text-slate-700">
                    <td className="px-4 py-3 font-black text-brasil-navy">{bet.userName}</td>
                    <td className="px-4 py-3">{bet.userPhone || "-"}</td>
                    <td className="px-4 py-3">{bet.originRef}</td>
                    <td className="px-4 py-3">{bet.match}</td>
                    <td className="px-4 py-3 font-black text-brasil-green">{bet.guess}</td>
                    <td className="px-4 py-3">{statusLabel(bet.betStatus)}</td>
                    <td className="px-4 py-3">{statusLabel(bet.paymentStatus)}</td>
                    <td className="px-4 py-3 font-black text-brasil-navy">{currency(bet.paidValue)}</td>
                    <td className="px-4 py-3">{bet.createdAtLabel || "-"}</td>
                    <td className="px-4 py-3">
                      {bet.canConfirmManually ? (
                        <ManualPaymentConfirmButton paymentId={bet.paymentId} />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredBets.length === 0 ? (
            <div className="p-5 font-semibold text-slate-600">Nenhuma aposta encontrada para este filtro.</div>
          ) : null}
        </div>
      </section>
      <section className="mt-10 grid gap-8 md:grid-cols-2">
        <div>
          <SectionTitle eyebrow="Rodadas" title="Jogos cadastrados" />
          <div className="grid gap-3">
            {stats.matches.map((match) => (
              <div key={match.id} className="rounded-lg bg-white p-4 shadow-field">
                <p className="font-black text-brasil-navy">{match.homeTeam} x {match.awayTeam}</p>
                <p className="text-sm font-semibold text-slate-600">{match.dateLabel}, {match.timeLabel}</p>
                <p className="mt-2 font-black text-brasil-green">Entrada: {currency(match.entryValue)}</p>
              </div>
            ))}
            {stats.matches.length === 0 ? (
              <div className="rounded-lg bg-white p-4 font-semibold text-slate-600 shadow-field">
                Nenhum jogo cadastrado no Supabase.
              </div>
            ) : null}
          </div>
        </div>
        <div>
          <SectionTitle eyebrow="Acumulado" title="Atualizacao manual" />
          <div className="mb-6 rounded-lg bg-white p-4 shadow-field">
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Prêmio garantido exibido
              <input
                defaultValue={currency(stats.prize)}
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

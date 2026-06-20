import { Banknote, BarChart3, CheckCircle2, CircleDollarSign, Clock, Edit3, Percent, ReceiptText, Trophy, UserPlus, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { ManualPaymentConfirmButton } from "@/components/manual-payment-confirm-button";
import { CloseRoundForm } from "@/components/close-round-form";
import { RankingScoreForm } from "@/components/ranking-score-form";
import { RoundExpensesManager } from "@/components/round-expenses-manager";
import { RoundInvitesManager } from "@/components/round-invites-manager";
import { AdminGamesManager } from "@/components/admin-games-manager";
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

function normalizeOriginGameFilter(value?: string) {
  return value?.trim() || "todos";
}

export default async function AdminPage({ searchParams }: { searchParams?: { filtro?: string; origemJogo?: string } }) {
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
  const activeOriginGame = normalizeOriginGameFilter(searchParams?.origemJogo);
  const originGameOptions = stats.matches.map((match) => ({
    id: match.id,
    label: `${match.homeTeam} x ${match.awayTeam}`
  }));
  const originRows = stats.originAnalytics
    .map((origin) => {
      const gameMetrics = activeOriginGame === "todos"
        ? { confirmedPayments: origin.confirmedPayments, paidTotal: origin.paidTotal }
        : origin.byGame[activeOriginGame] ?? { confirmedPayments: 0, paidTotal: 0 };

      return {
        ...origin,
        shownConfirmedPayments: gameMetrics.confirmedPayments,
        shownPaidTotal: gameMetrics.paidTotal,
        shownConversionRate: origin.signups > 0 ? Math.round((gameMetrics.confirmedPayments / origin.signups) * 100) : 0,
        shownAverageTicket: gameMetrics.confirmedPayments > 0 ? gameMetrics.paidTotal / gameMetrics.confirmedPayments : 0
      };
    })
    .sort((a, b) => b.shownPaidTotal - a.shownPaidTotal || b.shownConfirmedPayments - a.shownConfirmedPayments || b.signups - a.signups);
  const bestOrigin = originRows.find((origin) => origin.shownPaidTotal > 0 || origin.shownConfirmedPayments > 0) ?? originRows[0];
  const closableMatches = stats.matches
    .filter((match) => match.status === "aberto" || match.status === "em_andamento")
    .map((match) => ({
      id: match.id,
      label: `${match.homeTeam} x ${match.awayTeam} - ${match.dateLabel}`
    }));
  const expenseMatches = stats.matches.map((match) => ({
    id: match.id,
    label: `${match.homeTeam} x ${match.awayTeam} - ${match.dateLabel}`
  }));
  const adminActions: Array<[string, LucideIcon]> = [
    ["Monitorar Pix Asaas pendentes", Clock],
    ["Confirmar palpites pagos automaticamente", CheckCircle2],
    ["Apurar Ranking da Torcida", Trophy],
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
      <section className="mt-8">
        <SectionTitle eyebrow="Rodada atual" title="📊 Conversão da Rodada" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Users} label="Visitantes" value={`${stats.roundConversion.visitors}`} tone="blue" />
          <StatCard icon={UserPlus} label="Cadastros" value={`${stats.roundConversion.signups}`} />
          <StatCard icon={CheckCircle2} label="Pagamentos confirmados" value={`${stats.roundConversion.confirmedPayments}`} tone="yellow" />
          <StatCard icon={Percent} label="Taxa cadastro" value={`${stats.roundConversion.signupRate}%`} />
          <StatCard icon={BarChart3} label="Taxa conversão" value={`${stats.roundConversion.conversionRate}%`} tone="blue" />
        </div>
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Rodadas" title="Gerenciar Jogos" />
        <AdminGamesManager games={stats.matches} />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Resultado geral" title="Financeiro" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Banknote} label="Arrecadação total" value={currency(stats.financial.totalCollected)} tone="yellow" />
          <StatCard icon={Trophy} label="Premiações pagas" value={currency(stats.financial.prizesPaid)} />
          <StatCard icon={ReceiptText} label="Despesas totais" value={currency(stats.financial.expensesTotal)} />
          <StatCard icon={Wallet} label="Saldo operacional real" value={currency(stats.financial.operationalBalance)} tone="blue" />
          <StatCard icon={CheckCircle2} label="Rodadas encerradas" value={`${stats.financial.closedRounds}`} />
          <StatCard icon={Clock} label="Rodadas abertas" value={`${stats.financial.openRounds}`} tone="yellow" />
          <StatCard icon={Users} label="Participações confirmadas" value={`${stats.financial.confirmedParticipations}`} tone="blue" />
          <StatCard icon={CircleDollarSign} label="Ticket médio" value={currency(stats.financial.averageTicket)} />
        </div>
        <div className="mt-5">
          <RoundExpensesManager matches={expenseMatches} expenses={stats.financial.expenses} />
        </div>
        <div className="mt-5 overflow-hidden rounded-lg bg-white shadow-field">
          <div className="border-b border-slate-100 p-4">
            <h3 className="text-xl font-black text-brasil-navy">Resumo por rodada</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Jogo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Participações confirmadas</th>
                  <th className="px-4 py-3">Arrecadado</th>
                  <th className="px-4 py-3">Premiação paga</th>
                  <th className="px-4 py-3">Despesas</th>
                  <th className="px-4 py-3">Saldo real</th>
                  <th className="px-4 py-3">Vencedores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.financial.rounds.map((round) => (
                  <tr key={round.id} className="font-semibold text-slate-700">
                    <td className="px-4 py-3 font-black text-brasil-navy">{round.match}</td>
                    <td className="px-4 py-3">{round.status}</td>
                    <td className="px-4 py-3">{round.confirmedParticipations}</td>
                    <td className="px-4 py-3 font-black text-brasil-green">{currency(round.collected)}</td>
                    <td className="px-4 py-3">{currency(round.prizePaid)}</td>
                    <td className="px-4 py-3">{currency(round.expenses)}</td>
                    <td className="px-4 py-3 font-black text-brasil-blue">{currency(round.balance)}</td>
                    <td className="px-4 py-3">{round.winners}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {stats.financial.rounds.length === 0 ? (
            <div className="p-5 font-semibold text-slate-600">Nenhuma rodada cadastrada.</div>
          ) : null}
        </div>
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Apuração" title="Encerrar rodada" />
        <CloseRoundForm matches={closableMatches} />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Ranking da Torcida" title="Apuração Ranking" />
        <RankingScoreForm matches={stats.rankingMatches} />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Reengajamento" title="Convites da Rodada" />
        <RoundInvitesManager inviteTools={stats.inviteTools} />
      </section>
      <section className="mt-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <SectionTitle eyebrow="Afiliados Premium" title="Origem dos Participantes" />
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-black shadow-field ${
                activeOriginGame === "todos" ? "bg-brasil-green text-white" : "bg-white text-brasil-navy"
              }`}
            >
              Todos
            </Link>
            {originGameOptions.map((game) => (
              <Link
                key={game.id}
                href={`/admin?origemJogo=${game.id}`}
                className={`inline-flex min-h-10 items-center rounded-full px-4 text-sm font-black shadow-field ${
                  activeOriginGame === game.id ? "bg-brasil-green text-white" : "bg-white text-brasil-navy"
                }`}
              >
                {game.label}
              </Link>
            ))}
          </div>
        </div>
        {bestOrigin ? (
          <div className="mb-4 rounded-lg bg-brasil-navy p-4 text-white shadow-field">
            <p className="text-sm font-black uppercase text-brasil-yellow">Melhor origem da rodada</p>
            <p className="mt-1 text-2xl font-black">{bestOrigin.originRef}</p>
            <p className="mt-1 font-semibold text-white/85">
              {bestOrigin.shownConfirmedPayments} pagamentos confirmados | {currency(bestOrigin.shownPaidTotal)}
            </p>
          </div>
        ) : null}
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Origem/ref</th>
                  <th className="px-4 py-3">Cadastros gerados</th>
                  <th className="px-4 py-3">Pagamentos confirmados</th>
                  <th className="px-4 py-3">Valor arrecadado</th>
                  <th className="px-4 py-3">Conversão</th>
                  <th className="px-4 py-3">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {originRows.map((origin) => (
                  <tr key={origin.originRef} className="font-semibold text-slate-700">
                    <td className="px-4 py-3 font-black text-brasil-navy">{origin.originRef}</td>
                    <td className="px-4 py-3">{origin.signups}</td>
                    <td className="px-4 py-3">{origin.shownConfirmedPayments}</td>
                    <td className="px-4 py-3 font-black text-brasil-green">{currency(origin.shownPaidTotal)}</td>
                    <td className="px-4 py-3">{origin.shownConversionRate}%</td>
                    <td className="px-4 py-3">{currency(origin.shownAverageTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {originRows.length === 0 ? (
            <div className="p-5 font-semibold text-slate-600">Nenhuma origem/ref encontrada.</div>
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
      <section className="mt-10">
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

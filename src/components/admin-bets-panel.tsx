"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { ManualPaymentConfirmButton } from "@/components/manual-payment-confirm-button";
import type { AdminBetRow } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

type AdminBetsPanelProps = {
  bets: AdminBetRow[];
  prizesPaid: number;
};

const PAGE_SIZE = 25;
const PAID_STATUSES = new Set(["paid", "confirmed", "received", "PAYMENT_RECEIVED"]);
const PENDING_STATUSES = new Set(["pending", "pending_payment", "aguardando_pagamento"]);

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

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function uniquePaymentTotal(bets: AdminBetRow[], predicate: (bet: AdminBetRow) => boolean) {
  const payments = new Map<string, number>();

  for (const bet of bets) {
    if (bet.paymentId && predicate(bet)) {
      payments.set(bet.paymentId, bet.paidValue);
    }
  }

  return Array.from(payments.values()).reduce((total, value) => total + value, 0);
}

function uniquePaymentCount(bets: AdminBetRow[], predicate: (bet: AdminBetRow) => boolean) {
  const payments = new Set<string>();

  for (const bet of bets) {
    if (bet.paymentId && predicate(bet)) {
      payments.add(bet.paymentId);
    }
  }

  return payments.size;
}

export function AdminBetsPanel({ bets, prizesPaid }: AdminBetsPanelProps) {
  const [round, setRound] = useState("todos");
  const [paymentStatus, setPaymentStatus] = useState("todos");
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [score, setScore] = useState("");
  const [date, setDate] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const rounds = useMemo(
    () => Array.from(new Set(bets.map((bet) => bet.match).filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [bets]
  );

  const filteredBets = useMemo(() => {
    const filters = {
      name: normalize(name),
      cpf: onlyDigits(cpf),
      phone: onlyDigits(phone),
      city: normalize(city),
      score: normalize(score),
      date: normalize(date),
      search: normalize(search)
    };

    return bets.filter((bet) => {
      const paid = PAID_STATUSES.has(bet.paymentStatus) || bet.filterStatus === "confirmados";
      const pending = PENDING_STATUSES.has(bet.paymentStatus) || bet.filterStatus === "pendentes";
      const searchable = normalize([
        bet.userName,
        bet.userCity,
        bet.userPhone,
        bet.userCpf,
        bet.match,
        bet.guess,
        bet.paymentStatus,
        bet.betStatus,
        bet.createdAtLabel
      ].join(" "));

      if (round !== "todos" && bet.match !== round) {
        return false;
      }
      if (paymentStatus === "confirmados" && !paid) {
        return false;
      }
      if (paymentStatus === "pendentes" && !pending) {
        return false;
      }
      if (filters.name && !normalize(bet.userName).includes(filters.name)) {
        return false;
      }
      if (filters.cpf && !onlyDigits(bet.userCpf).includes(filters.cpf)) {
        return false;
      }
      if (filters.phone && !onlyDigits(bet.userPhone).includes(filters.phone)) {
        return false;
      }
      if (filters.city && !normalize(bet.userCity).includes(filters.city)) {
        return false;
      }
      if (filters.score && !normalize(bet.guess).includes(filters.score)) {
        return false;
      }
      if (filters.date && !normalize(bet.createdAtLabel).includes(filters.date)) {
        return false;
      }

      return !filters.search || searchable.includes(filters.search);
    });
  }, [bets, city, cpf, date, name, paymentStatus, phone, round, score, search]);

  const maxPage = Math.max(1, Math.ceil(filteredBets.length / PAGE_SIZE));
  const currentPage = Math.min(page, maxPage);
  const visibleBets = filteredBets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const confirmedPayments = uniquePaymentCount(filteredBets, (bet) => PAID_STATUSES.has(bet.paymentStatus) || bet.filterStatus === "confirmados");
  const pendingPayments = uniquePaymentCount(filteredBets, (bet) => PENDING_STATUSES.has(bet.paymentStatus) || bet.filterStatus === "pendentes");
  const collected = uniquePaymentTotal(filteredBets, (bet) => PAID_STATUSES.has(bet.paymentStatus) || bet.filterStatus === "confirmados");

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    setPage(1);
  }

  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="font-black uppercase text-brasil-green">Operação</p>
        <h2 className="text-2xl font-black text-brasil-navy">Apostas realizadas</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-lg bg-white p-4 shadow-field">
          <p className="text-xs font-black uppercase text-slate-500">Total de apostas</p>
          <p className="mt-1 text-2xl font-black text-brasil-navy">{filteredBets.length}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-field">
          <p className="text-xs font-black uppercase text-slate-500">Pagamentos confirmados</p>
          <p className="mt-1 text-2xl font-black text-brasil-green">{confirmedPayments}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-field">
          <p className="text-xs font-black uppercase text-slate-500">Pendentes</p>
          <p className="mt-1 text-2xl font-black text-brasil-blue">{pendingPayments}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-field">
          <p className="text-xs font-black uppercase text-slate-500">Arrecadação</p>
          <p className="mt-1 text-2xl font-black text-brasil-navy">{currency(collected)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-field">
          <p className="text-xs font-black uppercase text-slate-500">Premiação</p>
          <p className="mt-1 text-2xl font-black text-brasil-navy">{currency(prizesPaid)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-white p-4 shadow-field">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Rodada
            <select
              value={round}
              onChange={(event) => updateFilter(setRound, event.target.value)}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
            >
              <option value="todos">Todas</option>
              {rounds.map((match) => (
                <option key={match} value={match}>{match}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Status do pagamento
            <select
              value={paymentStatus}
              onChange={(event) => updateFilter(setPaymentStatus, event.target.value)}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
            >
              <option value="todos">Todos</option>
              <option value="confirmados">Confirmados</option>
              <option value="pendentes">Pendentes</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Nome
            <input value={name} onChange={(event) => updateFilter(setName, event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            WhatsApp
            <input value={phone} onChange={(event) => updateFilter(setPhone, event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            CPF
            <input value={cpf} onChange={(event) => updateFilter(setCpf, event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Cidade
            <input value={city} onChange={(event) => updateFilter(setCity, event.target.value)} className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Placar
            <input value={score} onChange={(event) => updateFilter(setScore, event.target.value)} placeholder="2 x 1" className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Data
            <input value={date} onChange={(event) => updateFilter(setDate, event.target.value)} placeholder="29/06" className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green" />
          </label>
        </div>
        <label className="mt-3 flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-black text-brasil-navy focus-within:border-brasil-green">
          <Search size={17} aria-hidden />
          <input
            value={search}
            onChange={(event) => updateFilter(setSearch, event.target.value)}
            placeholder="Pesquisa instantânea por qualquer informação"
            className="w-full bg-transparent font-semibold outline-none"
          />
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg bg-white shadow-field">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">WhatsApp</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Placar</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Rodada</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleBets.map((bet) => (
                <tr key={bet.id} className="font-semibold text-slate-700">
                  <td className="px-4 py-3 font-black text-brasil-navy">{bet.userName}</td>
                  <td className="px-4 py-3">{bet.userCity || "-"}</td>
                  <td className="px-4 py-3">{bet.userPhone || "-"}</td>
                  <td className="px-4 py-3">{bet.userCpf || "-"}</td>
                  <td className="px-4 py-3 font-black text-brasil-green">{bet.guess}</td>
                  <td className="px-4 py-3 font-black text-brasil-navy">{currency(bet.paidValue)}</td>
                  <td className="px-4 py-3">{statusLabel(bet.paymentStatus)}</td>
                  <td className="px-4 py-3">{bet.createdAtLabel || "-"}</td>
                  <td className="px-4 py-3">{bet.match}</td>
                  <td className="px-4 py-3">{statusLabel(bet.betStatus)}</td>
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
          <div className="p-5 font-semibold text-slate-600">Nenhuma aposta encontrada para estes filtros.</div>
        ) : null}
        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 text-sm font-bold text-slate-600 md:flex-row md:items-center md:justify-between">
          <span>
            Mostrando {visibleBets.length} de {filteredBets.length} apostas encontradas.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-100 px-4 font-black text-brasil-navy disabled:opacity-50"
            >
              <ChevronLeft size={17} aria-hidden />
              Anterior
            </button>
            <span className="px-2 font-black text-brasil-navy">{currentPage} / {maxPage}</span>
            <button
              type="button"
              disabled={currentPage >= maxPage}
              onClick={() => setPage((value) => Math.min(maxPage, value + 1))}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-slate-100 px-4 font-black text-brasil-navy disabled:opacity-50"
            >
              Próxima
              <ChevronRight size={17} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

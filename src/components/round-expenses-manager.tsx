"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { currency } from "@/lib/utils";
import type { AdminRoundExpense } from "@/data/supabase-live";

type RoundExpenseMatch = {
  id: string;
  label: string;
};

type RoundExpensesManagerProps = {
  matches: RoundExpenseMatch[];
  expenses: AdminRoundExpense[];
};

export function RoundExpensesManager({ matches, expenses }: RoundExpensesManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/despesas", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jogo_id: formData.get("jogo_id"),
          descricao: formData.get("descricao"),
          valor: Number(formData.get("valor"))
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível salvar a despesa.");
      }

      setDescription("");
      setValue("");
      setOpen(false);
      setMessage("Despesa cadastrada com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar a despesa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-field">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-brasil-navy">Despesas da Rodada</h3>
          <p className="text-sm font-semibold text-slate-600">Cadastre custos extras para calcular o saldo real.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field"
        >
          <Plus size={18} aria-hidden />
          Adicionar despesa
        </button>
      </div>

      {open ? (
        <form onSubmit={submit} className="mt-4 grid gap-3 rounded-lg bg-brasil-light p-4">
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Rodada/Jogo
            <select name="jogo_id" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
              <option value="">Selecione</option>
              {matches.map((match) => (
                <option key={match.id} value={match.id}>{match.label}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 md:grid-cols-[1fr_180px]">
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Descrição
              <input
                name="descricao"
                required
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Divulgação Alta News"
                className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Valor
              <input
                name="valor"
                required
                type="number"
                min={0.01}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="min-h-11 rounded-full bg-brasil-blue px-5 font-black text-white shadow-field disabled:opacity-60"
          >
            {loading ? "Salvando..." : "Salvar despesa"}
          </button>
        </form>
      ) : null}

      {message ? <p className="mt-3 text-sm font-bold text-brasil-green">{message}</p> : null}

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Jogo</th>
                <th className="px-4 py-3">Descrição</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="font-semibold text-slate-700">
                  <td className="px-4 py-3 font-black text-brasil-navy">{expense.match}</td>
                  <td className="px-4 py-3">{expense.description}</td>
                  <td className="px-4 py-3 font-black text-brasil-green">{currency(expense.value)}</td>
                  <td className="px-4 py-3">{expense.createdAtLabel || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {expenses.length === 0 ? (
          <div className="p-4 font-semibold text-slate-600">Nenhuma despesa cadastrada.</div>
        ) : null}
      </div>
    </div>
  );
}

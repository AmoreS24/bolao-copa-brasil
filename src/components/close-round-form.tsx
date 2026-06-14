"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type CloseRoundMatch = {
  id: string;
  label: string;
};

type CloseRoundFormProps = {
  matches: CloseRoundMatch[];
};

export function CloseRoundForm({ matches }: CloseRoundFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmed = window.confirm("Confirma o encerramento desta rodada?");

    if (!confirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/encerrar-rodada", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jogo_id: formData.get("jogo_id"),
          gols_casa: Number(formData.get("gols_casa")),
          gols_visitante: Number(formData.get("gols_visitante")),
          valor_premio: Number(formData.get("valor_premio"))
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível encerrar a rodada.");
      }

      setMessage(payload.message || "Rodada encerrada com sucesso.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a rodada.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg bg-white p-4 shadow-field">
      <label className="grid gap-2 text-sm font-black text-brasil-navy">
        Jogo
        <select name="jogo_id" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
          <option value="">Selecione</option>
          {matches.map((match) => (
            <option key={match.id} value={match.id}>{match.label}</option>
          ))}
        </select>
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Gols da casa
          <input name="gols_casa" type="number" min={0} required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
        </label>
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Gols visitante
          <input name="gols_visitante" type="number" min={0} required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-black text-brasil-navy">
        Valor total da premiação
        <input name="valor_premio" type="number" min={0} step="0.01" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
      </label>
      <button
        type="submit"
        disabled={loading || matches.length === 0}
        className="min-h-11 rounded-full bg-brasil-green px-5 font-black text-white shadow-field disabled:opacity-60"
      >
        {loading ? "Encerrando..." : "Encerrar rodada"}
      </button>
      {message ? <p className="text-sm font-bold text-brasil-green">{message}</p> : null}
      {matches.length === 0 ? <p className="text-sm font-semibold text-slate-600">Nenhum jogo aberto ou em andamento.</p> : null}
    </form>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RankingScoreMatch = {
  id: string;
  label: string;
};

type RankingScoreFormProps = {
  matches: RankingScoreMatch[];
};

export function RankingScoreForm({ matches }: RankingScoreFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmed = window.confirm("Confirma a apuração do Ranking da Torcida para esta rodada?");

    if (!confirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/apurar-ranking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jogo_id: formData.get("jogo_id"),
          resultado_oficial: formData.get("resultado_oficial"),
          primeiro_gol: formData.get("primeiro_gol"),
          faixa_escanteios: formData.get("faixa_escanteios"),
          faixa_cartoes: formData.get("faixa_cartoes")
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível apurar o ranking.");
      }

      setMessage(`${payload.message || "Ranking apurado."} Votos apurados: ${payload.votos_apurados ?? 0}.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível apurar o ranking.");
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
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Resultado oficial
          <select name="resultado_oficial" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
            <option value="">Selecione</option>
            <option>Brasil vence</option>
            <option>Marrocos vence</option>
            <option>Empate</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Primeiro a marcar
          <select name="primeiro_gol" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
            <option value="">Selecione</option>
            <option>Brasil</option>
            <option>Marrocos</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Faixa de escanteios
          <select name="faixa_escanteios" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
            <option value="">Selecione</option>
            <option>0-3</option>
            <option>4-6</option>
            <option>7-10</option>
            <option>11+</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          Faixa de cartões
          <select name="faixa_cartoes" required className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green">
            <option value="">Selecione</option>
            <option>0-2</option>
            <option>3-5</option>
            <option>6-8</option>
            <option>9+</option>
          </select>
        </label>
      </div>
      <p className="text-xs font-semibold text-slate-600">
        A faixa de gols será calculada automaticamente a partir do placar final salvo na rodada.
      </p>
      <button
        type="submit"
        disabled={loading || matches.length === 0}
        className="min-h-11 rounded-full bg-brasil-blue px-5 font-black text-white shadow-field disabled:opacity-60"
      >
        {loading ? "Apurando..." : "Apurar Ranking"}
      </button>
      {message ? <p className="text-sm font-bold text-brasil-green">{message}</p> : null}
      {matches.length === 0 ? <p className="text-sm font-semibold text-slate-600">Nenhum jogo com placar oficial salvo.</p> : null}
    </form>
  );
}

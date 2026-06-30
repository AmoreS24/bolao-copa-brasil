"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { currency } from "@/lib/utils";

type CloseRoundMatch = {
  id: string;
  label: string;
};

type CloseRoundFormProps = {
  matches: CloseRoundMatch[];
};

type CloseRoundResult = {
  participacoes_confirmadas: number;
  vencedores: number;
  valor_por_vencedor: number;
  valor_total_premiacao: number;
  lista_vencedores: Array<{
    nome: string;
    telefone: string;
    palpite: string;
    valor: number;
  }>;
};

export function CloseRoundForm({ matches }: CloseRoundFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<CloseRoundResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const confirmed = window.confirm("Confirma o encerramento desta rodada?");

    if (!confirmed) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setLoading(true);
    setMessage("");
    setResult(null);
    setCopied(false);

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
      setResult({
        participacoes_confirmadas: Number(payload.participacoes_confirmadas ?? 0),
        vencedores: Number(payload.vencedores ?? 0),
        valor_por_vencedor: Number(payload.valor_por_vencedor ?? 0),
        valor_total_premiacao: Number(payload.valor_total_premiacao ?? 0),
        lista_vencedores: Array.isArray(payload.lista_vencedores) ? payload.lista_vencedores : []
      });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível encerrar a rodada.");
    } finally {
      setLoading(false);
    }
  }

  async function copyWinners() {
    if (!result) {
      return;
    }

    const text = result.lista_vencedores.length > 0
      ? [
        `Total de vencedores: ${result.vencedores}`,
        `Premiação total: ${currency(result.valor_total_premiacao)}`,
        `Valor por vencedor: ${currency(result.valor_por_vencedor)}`,
        "",
        ...result.lista_vencedores.map((winner) => `${winner.nome} (${winner.telefone}) - Palpite ${winner.palpite} - ${currency(winner.valor)}`)
      ].join("\n")
      : `Rodada sem vencedores. Participações confirmadas: ${result.participacoes_confirmadas}.`;

    await navigator.clipboard.writeText(text);
    setCopied(true);
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
      {result ? (
        <div className="grid gap-3 rounded-lg bg-brasil-light p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Participações</p>
              <p className="text-2xl font-black text-brasil-navy">{result.participacoes_confirmadas}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Vencedores</p>
              <p className="text-2xl font-black text-brasil-green">{result.vencedores}</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-500">Valor individual</p>
              <p className="text-2xl font-black text-brasil-navy">{currency(result.valor_por_vencedor)}</p>
            </div>
          </div>
          {result.lista_vencedores.length > 0 ? (
            <div className="overflow-hidden rounded-lg bg-white">
              {result.lista_vencedores.map((winner) => (
                <div key={`${winner.nome}-${winner.palpite}`} className="flex flex-col gap-1 border-b border-slate-100 p-3 text-sm font-semibold text-slate-700 last:border-0 md:flex-row md:items-center md:justify-between">
                  <span className="font-black text-brasil-navy">{winner.nome}</span>
                  <span>{winner.telefone}</span>
                  <span>Palpite {winner.palpite}</span>
                  <span className="font-black text-brasil-green">{currency(winner.valor)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-semibold text-slate-700">Nenhum participante acertou o placar exato.</p>
          )}
          <button
            type="button"
            onClick={() => void copyWinners()}
            className="min-h-10 rounded-full bg-brasil-navy px-4 text-sm font-black text-white"
          >
            {copied ? "Lista copiada" : "Copiar lista dos vencedores"}
          </button>
        </div>
      ) : null}
      {matches.length === 0 ? <p className="text-sm font-semibold text-slate-600">Nenhum jogo aberto ou em andamento.</p> : null}
    </form>
  );
}

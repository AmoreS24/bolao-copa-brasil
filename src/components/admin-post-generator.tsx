"use client";

import { useMemo, useState } from "react";
import type { ClosedRound, LiveMatch } from "@/data/supabase-live";
import { countryFlag } from "@/lib/countries";
import { currency } from "@/lib/utils";

type AdminPostGeneratorProps = {
  matches: LiveMatch[];
  closedRounds: ClosedRound[];
};

function matchLabel(match: LiveMatch) {
  return `${countryFlag(match.homeTeam)} ${match.homeTeam} x ${match.awayTeam} ${countryFlag(match.awayTeam)}`.trim();
}

export function AdminPostGenerator({ matches, closedRounds }: AdminPostGeneratorProps) {
  const [selectedRoundId, setSelectedRoundId] = useState(closedRounds[0]?.id ?? "");
  const [selectedNextId, setSelectedNextId] = useState(matches.find((match) => match.status === "aberto")?.id ?? matches[0]?.id ?? "");
  const [copied, setCopied] = useState("");
  const selectedRound = closedRounds.find((round) => round.id === selectedRoundId) ?? closedRounds[0] ?? null;
  const selectedNext = matches.find((match) => match.id === selectedNextId) ?? matches[0] ?? null;
  const textBlocks = useMemo(() => {
    const winnersText = selectedRound?.winners.length
      ? selectedRound.winners.map((winner) => `🏆 ${winner.name} - Palpite ${winner.guess} - ${currency(winner.prizeValue)}`).join("\n")
      : "🔥 Ninguém acertou o placar exato. A premiação acumulou para a próxima rodada.";
    const paidText = selectedRound?.winners.length
      ? selectedRound.winners.map((winner) => `✅ ${winner.name}: ${currency(winner.prizeValue)} pago via PIX.`).join("\n")
      : "Sem comprovantes de vencedores nesta rodada.";
    const nextText = selectedNext
      ? [
        "⚽ Próxima rodada aberta!",
        "",
        matchLabel(selectedNext),
        `${selectedNext.dateLabel} às ${selectedNext.timeLabel}`,
        `Palpites até ${selectedNext.bettingClosesLabel}`,
        `Prêmio mínimo: ${currency(selectedNext.guaranteedPrize)}`,
        "",
        `Participe: https://bolao-copa-brasil.vercel.app/jogos/${selectedNext.id}`
      ].join("\n")
      : "Nenhuma próxima rodada cadastrada.";

    return [
      {
        id: "resultado",
        title: "Resultado final",
        text: selectedRound
          ? [`⚽ Resultado final`, "", selectedRound.result, "", selectedRound.accumulated ? "🔥 Acumulou para a próxima rodada!" : "🏆 Tivemos vencedor(es)!"].join("\n")
          : "Selecione uma rodada encerrada."
      },
      {
        id: "vencedores",
        title: "Lista de vencedores",
        text: selectedRound ? [`🏆 Vencedores da rodada`, "", selectedRound.result, "", winnersText].join("\n") : "Selecione uma rodada encerrada."
      },
      {
        id: "comprovantes",
        title: "Comprovantes pagos",
        text: selectedRound ? [`✅ Premiações pagas`, "", paidText].join("\n") : "Selecione uma rodada encerrada."
      },
      {
        id: "proxima",
        title: "Próxima rodada",
        text: nextText
      }
    ];
  }, [selectedNext, selectedRound]);

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(id);
  }

  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="font-black uppercase text-brasil-green">Divulgação</p>
        <h2 className="text-2xl font-black text-brasil-navy">Gerar texto para postagem</h2>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-field">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Rodada encerrada
            <select
              value={selectedRoundId}
              onChange={(event) => setSelectedRoundId(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
            >
              {closedRounds.map((round) => (
                <option key={round.id} value={round.id}>{round.match} - {round.dateLabel}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Próxima rodada
            <select
              value={selectedNextId}
              onChange={(event) => setSelectedNextId(event.target.value)}
              className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
            >
              {matches.map((match) => (
                <option key={match.id} value={match.id}>{match.homeTeam} x {match.awayTeam} - {match.dateLabel}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {textBlocks.map((block) => (
            <div key={block.id} className="grid gap-3 rounded-lg bg-brasil-light p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-black text-brasil-navy">{block.title}</h3>
                <button
                  type="button"
                  onClick={() => void copyText(block.id, block.text)}
                  className="min-h-9 rounded-full bg-brasil-green px-3 text-xs font-black text-white"
                >
                  {copied === block.id ? "Copiado" : "Copiar"}
                </button>
              </div>
              <pre className="min-h-44 whitespace-pre-wrap rounded-lg bg-white p-3 text-sm font-semibold text-slate-700">{block.text}</pre>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

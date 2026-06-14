"use client";

import { useState } from "react";
import { Copy } from "lucide-react";
import { countryWithFlag } from "@/lib/countries";
import type { AdminRoundInviteTools } from "@/data/supabase-live";

type RoundInvitesManagerProps = {
  inviteTools: AdminRoundInviteTools;
};

function generalMessage(inviteTools: AdminRoundInviteTools) {
  if (!inviteTools.currentMatch) {
    return "";
  }

  const match = inviteTools.currentMatch;

  return `⚽ Rodada 2 aberta!

${countryWithFlag(match.homeTeam)} x ${countryWithFlag(match.awayTeam)}

O bolão já está liberado e a premiação começa com R$ 200,00 garantidos + 60% do valor arrecadado.

Faça seu palpite:
${match.publicUrl}

Boa sorte! 🍀🏆`;
}

function participantMessage(name: string, inviteTools: AdminRoundInviteTools) {
  if (!inviteTools.currentMatch) {
    return "";
  }

  const match = inviteTools.currentMatch;

  return `Olá, ${name}! ⚽🇧🇷

A nova rodada do Bolão Jogos do Brasil já está aberta!

${countryWithFlag(match.homeTeam)} x ${countryWithFlag(match.awayTeam)}

O prêmio começa com R$ 200,00 garantidos + 60% do valor arrecadado.

Faça seu palpite novamente:
${match.publicUrl}

Boa sorte! 🍀🏆`;
}

export function RoundInvitesManager({ inviteTools }: RoundInvitesManagerProps) {
  const [copied, setCopied] = useState("");

  async function copyMessage(key: string, message: string) {
    await navigator.clipboard.writeText(message);
    setCopied(key);
    window.setTimeout(() => setCopied(""), 1800);
  }

  if (!inviteTools.currentMatch) {
    return (
      <div className="rounded-lg bg-white p-4 font-semibold text-slate-600 shadow-field">
        Nenhuma rodada aberta encontrada para gerar convites.
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-4 shadow-field">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-brasil-navy">{inviteTools.currentMatch.label}</h3>
          <p className="text-sm font-semibold text-slate-600">Reengaje participantes das rodadas anteriores.</p>
        </div>
        <button
          type="button"
          onClick={() => copyMessage("geral", generalMessage(inviteTools))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field"
        >
          <Copy size={18} aria-hidden />
          {copied === "geral" ? "Copiado!" : "Copiar convite geral"}
        </button>
      </div>

      <div className="mt-5 overflow-hidden rounded-lg border border-slate-100">
        <div className="overflow-x-auto">
          <table className="min-w-[860px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Última rodada</th>
                <th className="px-4 py-3">Já participou?</th>
                <th className="px-4 py-3">Convite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inviteTools.participants.map((participant) => (
                <tr key={participant.id} className="font-semibold text-slate-700">
                  <td className="px-4 py-3 font-black text-brasil-navy">{participant.name}</td>
                  <td className="px-4 py-3">{participant.phone || "-"}</td>
                  <td className="px-4 py-3">{participant.lastMatch}</td>
                  <td className="px-4 py-3">{participant.joinedCurrentRound ? "Sim" : "Não"}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => copyMessage(participant.id, participantMessage(participant.name, inviteTools))}
                      className="min-h-9 rounded-full bg-brasil-blue px-3 text-xs font-black text-white shadow-field"
                    >
                      {copied === participant.id ? "Copiado!" : "Copiar convite"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {inviteTools.participants.length === 0 ? (
          <div className="p-4 font-semibold text-slate-600">Nenhum participante anterior encontrado.</div>
        ) : null}
      </div>
    </div>
  );
}

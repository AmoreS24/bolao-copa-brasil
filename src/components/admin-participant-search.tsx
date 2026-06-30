"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { currency } from "@/lib/utils";

type ParticipantDetail = {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  origem_ref: string;
  criado_em: string;
  rodadas_participadas: number;
  total_pago: number;
  premios_recebidos: number;
  palpites: Array<{
    id: string;
    jogo: string;
    data: string;
    placar: string;
    status: string;
    resultado: string;
    criado_em: string;
  }>;
  pagamentos: Array<{
    id: string;
    status: string;
    valor: number;
    criado_em: string;
  }>;
  premios: Array<{
    id: string;
    valor: number;
    criado_em: string;
  }>;
};

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    confirmed: "Confirmado",
    paid: "Pago",
    received: "Recebido",
    PAYMENT_RECEIVED: "Recebido",
    pending_payment: "Aguardando pagamento",
    pending: "Pendente",
    aguardando: "Aguardando",
    vencedor: "Vencedor",
    perdedor: "Não vencedor"
  };

  return labels[status] ?? status;
}

export function AdminParticipantSearch() {
  const [query, setQuery] = useState("");
  const [participants, setParticipants] = useState<ParticipantDetail[]>([]);
  const [selected, setSelected] = useState<ParticipantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function searchParticipant(nextQuery = query) {
    const cleanQuery = nextQuery.trim();

    if (cleanQuery.length < 2) {
      setParticipants([]);
      setSelected(null);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`/api/admin/participante?q=${encodeURIComponent(cleanQuery)}`, {
        cache: "no-store"
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível buscar participante.");
      }

      const nextParticipants = Array.isArray(payload.participants) ? payload.participants : [];
      setParticipants(nextParticipants);
      setSelected(nextParticipants[0] ?? null);
      setMessage(nextParticipants.length === 0 ? "Nenhum participante encontrado." : "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível buscar participante.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4">
        <p className="font-black uppercase text-brasil-green">Atendimento</p>
        <h2 className="text-2xl font-black text-brasil-navy">Buscar participante</h2>
      </div>
      <div className="rounded-lg bg-white p-4 shadow-field">
        <label className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-black text-brasil-navy focus-within:border-brasil-green">
          <Search size={18} aria-hidden />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              void searchParticipant(event.target.value);
            }}
            placeholder="Buscar por nome, telefone ou CPF"
            className="w-full bg-transparent font-semibold outline-none"
          />
        </label>
        {loading ? <p className="mt-3 text-sm font-bold text-slate-600">Buscando...</p> : null}
        {message ? <p className="mt-3 text-sm font-bold text-brasil-green">{message}</p> : null}

        {participants.length > 1 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {participants.map((participant) => (
              <button
                key={participant.id}
                type="button"
                onClick={() => setSelected(participant)}
                className={`min-h-10 rounded-full px-4 text-sm font-black ${
                  selected?.id === participant.id ? "bg-brasil-green text-white" : "bg-slate-100 text-brasil-navy"
                }`}
              >
                {participant.nome}
              </button>
            ))}
          </div>
        ) : null}

        {selected ? (
          <div className="mt-5 grid gap-4">
            <div className="grid gap-3 rounded-lg bg-brasil-light p-4 md:grid-cols-4">
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Nome</p>
                <p className="font-black text-brasil-navy">{selected.nome}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">WhatsApp</p>
                <p className="font-black text-brasil-navy">{selected.telefone || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">CPF</p>
                <p className="font-black text-brasil-navy">{selected.cpf || "-"}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Origem</p>
                <p className="font-black text-brasil-navy">{selected.origem_ref}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Rodadas</p>
                <p className="text-2xl font-black text-brasil-green">{selected.rodadas_participadas}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Pago</p>
                <p className="text-2xl font-black text-brasil-navy">{currency(selected.total_pago)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Prêmios</p>
                <p className="text-2xl font-black text-brasil-navy">{currency(selected.premios_recebidos)}</p>
              </div>
              <div>
                <p className="text-xs font-black uppercase text-slate-500">Cadastro</p>
                <p className="font-black text-brasil-navy">{selected.criado_em || "-"}</p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="bg-slate-50 px-4 py-3 font-black text-brasil-navy">Histórico de palpites</div>
                {selected.palpites.map((guess) => (
                  <div key={guess.id} className="border-t border-slate-100 p-4 text-sm font-semibold text-slate-700">
                    <p className="font-black text-brasil-navy">{guess.jogo}</p>
                    <p>Palpite: {guess.placar}</p>
                    <p>Status: {statusLabel(guess.status)} | Resultado: {statusLabel(guess.resultado)}</p>
                    <p className="text-xs text-slate-500">{guess.criado_em || guess.data}</p>
                  </div>
                ))}
                {selected.palpites.length === 0 ? <p className="p-4 text-sm font-semibold text-slate-600">Nenhum palpite encontrado.</p> : null}
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-100">
                <div className="bg-slate-50 px-4 py-3 font-black text-brasil-navy">Pagamentos e prêmios</div>
                {selected.pagamentos.map((payment) => (
                  <div key={payment.id} className="border-t border-slate-100 p-4 text-sm font-semibold text-slate-700">
                    <p className="font-black text-brasil-navy">{currency(payment.valor)}</p>
                    <p>Status: {statusLabel(payment.status)}</p>
                    <p className="text-xs text-slate-500">{payment.criado_em || "-"}</p>
                  </div>
                ))}
                {selected.premios.map((prize) => (
                  <div key={prize.id} className="border-t border-slate-100 bg-green-50 p-4 text-sm font-semibold text-green-800">
                    Prêmio recebido: {currency(prize.valor)} em {prize.criado_em || "-"}
                  </div>
                ))}
                {selected.pagamentos.length === 0 && selected.premios.length === 0 ? (
                  <p className="p-4 text-sm font-semibold text-slate-600">Nenhum pagamento ou prêmio encontrado.</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

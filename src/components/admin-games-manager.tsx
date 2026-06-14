"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Edit3, Plus, Trophy } from "lucide-react";
import type { LiveMatch } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

type AdminGamesManagerProps = {
  games: LiveMatch[];
};

type GameFormState = {
  id: string;
  time_da_casa: string;
  time_visitante: string;
  data_de_correspondencia: string;
  local: string;
  cidade: string;
  grupo: string;
  premio_garantido: string;
  valor_palpite: string;
  status_jogo: "aguardando" | "aberto" | "encerrado";
};

const emptyForm: GameFormState = {
  id: "",
  time_da_casa: "",
  time_visitante: "",
  data_de_correspondencia: "",
  local: "",
  cidade: "",
  grupo: "",
  premio_garantido: "200",
  valor_palpite: "10",
  status_jogo: "aguardando"
};

const statusLabels: Record<GameFormState["status_jogo"], string> = {
  aguardando: "Aguardando",
  aberto: "Aberto",
  encerrado: "Encerrado"
};

function toInputDate(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Santarem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);

  return parts.replace(" ", "T");
}

function formFromGame(game: LiveMatch): GameFormState {
  return {
    id: game.id,
    time_da_casa: game.homeTeam,
    time_visitante: game.awayTeam,
    data_de_correspondencia: toInputDate(game.startsAt),
    local: game.venue === "Estádio a confirmar" ? "" : game.venue,
    cidade: game.city,
    grupo: game.group,
    premio_garantido: String(game.guaranteedPrize || 200),
    valor_palpite: String(game.entryValue || 10),
    status_jogo: game.status === "aberto" || game.status === "encerrado" ? game.status : "aguardando"
  };
}

export function AdminGamesManager({ games }: AdminGamesManagerProps) {
  const router = useRouter();
  const [form, setForm] = useState<GameFormState>(emptyForm);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const sortedGames = useMemo(
    () => [...games].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [games]
  );

  function updateField(field: keyof GameFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function send(payload: Record<string, unknown>, successMessage: string) {
    setError("");
    setMessage("");

    const response = await fetch("/api/admin/jogos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const data = (await response.json().catch(() => ({}))) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Não foi possível salvar o jogo.");
      return;
    }

    setMessage(successMessage);
    setIsFormVisible(false);
    setForm(emptyForm);
    startTransition(() => router.refresh());
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(
      {
        action: "save",
        ...form,
        premio_garantido: Number(form.premio_garantido),
        valor_palpite: Number(form.valor_palpite)
      },
      form.id ? "Jogo atualizado com sucesso." : "Jogo criado com sucesso."
    );
  }

  function handleNewGame() {
    setForm(emptyForm);
    setIsFormVisible(true);
    setError("");
    setMessage("");
  }

  function handleEdit(game: LiveMatch) {
    setForm(formFromGame(game));
    setIsFormVisible(true);
    setError("");
    setMessage("");
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg bg-white p-4 shadow-field md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-black text-brasil-navy">Jogos e rodadas</p>
          <p className="text-sm font-semibold text-slate-600">Crie, edite e abra a rodada atual sem mexer no banco manualmente.</p>
        </div>
        <button
          type="button"
          onClick={handleNewGame}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field"
        >
          <Plus size={18} aria-hidden />
          Novo jogo
        </button>
      </div>

      {message ? (
        <div className="rounded-lg bg-green-50 p-3 font-black text-green-700">{message}</div>
      ) : null}
      {error ? (
        <div className="rounded-lg bg-red-50 p-3 font-black text-red-700">{error}</div>
      ) : null}

      {isFormVisible ? (
        <form onSubmit={handleSubmit} className="grid gap-4 rounded-lg bg-white p-4 shadow-field">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Time da casa
              <input
                required
                value={form.time_da_casa}
                onChange={(event) => updateField("time_da_casa", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Time visitante
              <input
                required
                value={form.time_visitante}
                onChange={(event) => updateField("time_visitante", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Data e hora
              <input
                required
                type="datetime-local"
                value={form.data_de_correspondencia}
                onChange={(event) => updateField("data_de_correspondencia", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Status
              <select
                value={form.status_jogo}
                onChange={(event) => updateField("status_jogo", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              >
                <option value="aguardando">Aguardando</option>
                <option value="aberto">Aberto</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Estádio
              <input
                value={form.local}
                onChange={(event) => updateField("local", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Cidade
              <input
                value={form.cidade}
                onChange={(event) => updateField("cidade", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <label className="grid gap-2 text-sm font-black text-brasil-navy">
              Grupo
              <input
                value={form.grupo}
                onChange={(event) => updateField("grupo", event.target.value)}
                className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-black text-brasil-navy">
                Prêmio garantido
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.premio_garantido}
                  onChange={(event) => updateField("premio_garantido", event.target.value)}
                  className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
                />
              </label>
              <label className="grid gap-2 text-sm font-black text-brasil-navy">
                Valor de entrada
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.valor_palpite}
                  onChange={(event) => updateField("valor_palpite", event.target.value)}
                  className="min-h-11 rounded-lg border border-slate-200 px-3 font-semibold outline-none focus:border-brasil-green"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="min-h-11 rounded-full bg-brasil-green px-5 font-black text-white shadow-field disabled:opacity-60"
            >
              {form.id ? "Salvar alterações" : "Criar jogo"}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsFormVisible(false);
                setForm(emptyForm);
              }}
              className="min-h-11 rounded-full bg-slate-100 px-5 font-black text-brasil-navy"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-lg bg-white shadow-field">
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Jogo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Prêmio</th>
                <th className="px-4 py-3">Entrada</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedGames.map((game) => (
                <tr key={game.id} className="font-semibold text-slate-700">
                  <td className="px-4 py-3">
                    <p className="font-black text-brasil-navy">{game.homeTeam} x {game.awayTeam}</p>
                    <p className="text-xs font-bold text-slate-500">{game.group}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <CalendarDays size={16} aria-hidden />
                      {game.dateLabel}, {game.timeLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">{game.venue}{game.city ? `, ${game.city}` : ""}</td>
                  <td className="px-4 py-3 font-black text-brasil-green">
                    {statusLabels[game.status === "aberto" || game.status === "encerrado" ? game.status : "aguardando"]}
                  </td>
                  <td className="px-4 py-3">{currency(game.guaranteedPrize)}</td>
                  <td className="px-4 py-3">{currency(game.entryValue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(game)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-full bg-slate-100 px-3 text-xs font-black text-brasil-navy"
                      >
                        <Edit3 size={15} aria-hidden />
                        Editar
                      </button>
                      {game.status !== "aberto" && game.status !== "encerrado" ? (
                        <button
                          type="button"
                          onClick={() => void send({ action: "open", id: game.id }, "Rodada aberta com sucesso.")}
                          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brasil-green px-3 text-xs font-black text-white"
                        >
                          Abrir rodada
                        </button>
                      ) : null}
                      {game.status !== "encerrado" ? (
                        <button
                          type="button"
                          onClick={() => void send({ action: "close", id: game.id }, "Rodada encerrada com sucesso.")}
                          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-brasil-yellow px-3 text-xs font-black text-brasil-blue"
                        >
                          <Trophy size={15} aria-hidden />
                          Encerrar rodada
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedGames.length === 0 ? (
          <div className="p-5 font-semibold text-slate-600">Nenhum jogo cadastrado no Supabase.</div>
        ) : null}
      </div>
    </div>
  );
}

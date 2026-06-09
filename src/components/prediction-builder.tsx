"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Wallet } from "lucide-react";
import { currency } from "@/lib/utils";

type Guess = {
  id: number;
  home: number;
  away: number;
};

type PredictionBuilderProps = {
  matchId: string;
  homeTeam: string;
  awayTeam: string;
  entryValue: number;
  operationalFee: number;
};

export function PredictionBuilder({
  matchId,
  homeTeam,
  awayTeam,
  entryValue,
  operationalFee
}: PredictionBuilderProps) {
  const router = useRouter();
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const subtotal = guesses.length * entryValue;
  const total = guesses.length > 0 ? subtotal + operationalFee : 0;

  function addGuess() {
    if (homeScore === "" || awayScore === "") {
      return;
    }

    setGuesses((currentGuesses) => [
      ...currentGuesses,
      {
        id: Date.now(),
        home: Math.max(0, Number(homeScore)),
        away: Math.max(0, Number(awayScore))
      }
    ]);
    setHomeScore("");
    setAwayScore("");
  }

  function removeGuess(id: number) {
    setGuesses((currentGuesses) => currentGuesses.filter((guess) => guess.id !== id));
  }

  async function generatePix() {
    if (guesses.length === 0) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/asaas/pix", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          matchId,
          guesses
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível gerar o Pix.");
      }

      router.push(`/pagamento?pagamento=${payload.payment.id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Não foi possível gerar o Pix.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          {homeTeam}
          <input
            type="number"
            min={0}
            value={homeScore}
            onChange={(event) => setHomeScore(event.target.value)}
            placeholder=" "
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-xl font-black text-brasil-navy shadow-field outline-none focus:border-brasil-green"
            aria-label={`Gols do ${homeTeam}`}
          />
        </label>
        <span className="hidden pb-3 text-2xl font-black text-brasil-green sm:block">x</span>
        <label className="grid gap-2 text-sm font-black text-brasil-navy">
          {awayTeam}
          <input
            type="number"
            min={0}
            value={awayScore}
            onChange={(event) => setAwayScore(event.target.value)}
            placeholder=" "
            className="min-h-12 w-full rounded-lg border border-slate-200 bg-white px-4 text-xl font-black text-brasil-navy shadow-field outline-none focus:border-brasil-green"
            aria-label={`Gols do ${awayTeam}`}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={addGuess}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brasil-blue px-5 font-black text-white shadow-field transition hover:-translate-y-0.5"
      >
        <Plus size={18} aria-hidden />
        Adicionar placar à lista
      </button>

      <div className="rounded-lg bg-brasil-light p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-black text-brasil-navy">Seus palpites</h2>
          <p className="text-sm font-black text-brasil-green">{guesses.length} selecionados</p>
        </div>
        <div className="mt-3 grid gap-2">
          {guesses.length === 0 ? (
            <p className="rounded-lg bg-white px-3 py-4 text-sm font-bold text-slate-500 shadow-field">
              Nenhum placar adicionado ainda.
            </p>
          ) : null}
          {guesses.map((guess) => (
            <div
              key={guess.id}
              className="grid min-h-12 grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-white px-3 font-black text-brasil-navy shadow-field"
            >
              <span>
                {homeTeam} {guess.home}x{guess.away} {awayTeam}
              </span>
              <button
                type="button"
                onClick={() => removeGuess(guess.id)}
                className="grid h-9 w-9 place-items-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-600"
                aria-label={`Remover palpite ${homeTeam} ${guess.home}x${guess.away} ${awayTeam}`}
              >
                <Trash2 size={17} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 p-4 sm:grid-cols-3">
        <div>
          <p className="text-sm font-bold text-slate-500">Palpites</p>
          <p className="text-xl font-black text-brasil-navy">{currency(subtotal)}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500">Taxa operacional</p>
          <p className="text-xl font-black text-brasil-navy">{currency(guesses.length > 0 ? operationalFee : 0)}</p>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-500">Total do Pix</p>
          <p className="text-xl font-black text-brasil-green">{currency(total)}</p>
        </div>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={generatePix}
        disabled={guesses.length === 0 || loading}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-center font-black shadow-field transition ${
          guesses.length === 0 || loading
            ? "bg-slate-200 text-slate-500"
            : "bg-brasil-green text-white hover:-translate-y-0.5"
        }`}
      >
        <Wallet size={19} aria-hidden />
        {loading ? "Gerando Pix..." : "Gerar Pix"}
      </button>
    </div>
  );
}

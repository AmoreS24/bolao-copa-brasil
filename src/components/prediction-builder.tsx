"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
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
  const [homeScore, setHomeScore] = useState(1);
  const [awayScore, setAwayScore] = useState(0);
  const [guesses, setGuesses] = useState<Guess[]>([
    { id: 1, home: 1, away: 0 },
    { id: 2, home: 2, away: 1 },
    { id: 3, home: 3, away: 0 }
  ]);

  const subtotal = guesses.length * entryValue;
  const total = guesses.length > 0 ? subtotal + operationalFee : 0;

  const paymentHref = useMemo(() => {
    const params = new URLSearchParams({
      jogo: matchId,
      palpites: guesses.map((guess) => `${guess.home}x${guess.away}`).join(",")
    });

    return `/pagamento?${params.toString()}`;
  }, [guesses, matchId]);

  function addGuess() {
    setGuesses((currentGuesses) => [
      ...currentGuesses,
      {
        id: Date.now(),
        home: Math.max(0, homeScore),
        away: Math.max(0, awayScore)
      }
    ]);
  }

  function removeGuess(id: number) {
    setGuesses((currentGuesses) => currentGuesses.filter((guess) => guess.id !== id));
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
            onChange={(event) => setHomeScore(Number(event.target.value))}
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
            onChange={(event) => setAwayScore(Number(event.target.value))}
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

      <Link
        href={paymentHref}
        aria-disabled={guesses.length === 0}
        className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-center font-black shadow-field transition ${
          guesses.length === 0
            ? "pointer-events-none bg-slate-200 text-slate-500"
            : "bg-brasil-green text-white hover:-translate-y-0.5"
        }`}
      >
        <Wallet size={19} aria-hidden />
        Gerar Pix
      </Link>
    </div>
  );
}

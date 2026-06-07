"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

type Score = {
  brazil: number;
  opponent: number;
};

export function AnimatedScoreboard({
  homeTeam,
  awayTeam,
  scores
}: {
  homeTeam: string;
  awayTeam: string;
  scores: Score[];
}) {
  const [index, setIndex] = useState(0);
  const safeScores = useMemo(() => {
    return scores.length > 0 ? scores : [{ brazil: 1, opponent: 0 }];
  }, [scores]);
  const score = safeScores[index] ?? safeScores[0];

  useEffect(() => {
    if (safeScores.length <= 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % safeScores.length);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [safeScores.length]);

  return (
    <div className="rounded-lg border border-white/20 bg-black/28 p-3 shadow-field backdrop-blur sm:p-4">
      <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <p className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-brasil-yellow sm:text-left sm:text-xs">
          Teste seu palpite
        </p>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <div className="text-right">
            <p className="text-xs font-black uppercase text-white/70 sm:text-sm">{homeTeam}</p>
            <p key={`brasil-${index}`} className="mt-1 text-4xl font-black leading-none sm:text-5xl">{score.brazil}</p>
          </div>
          <div className="grid place-items-center">
            <span className="text-2xl font-black text-brasil-yellow">x</span>
          </div>
          <div>
            <p className="text-xs font-black uppercase text-white/70 sm:text-sm">{awayTeam}</p>
            <p key={`opponent-${index}`} className="mt-1 text-4xl font-black leading-none sm:text-5xl">{score.opponent}</p>
          </div>
        </div>
        <Link
          href="/cadastro"
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-brasil-yellow px-4 text-sm font-black text-brasil-navy shadow-field transition hover:-translate-y-0.5 sm:w-auto"
        >
          Quero palpitar
          <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

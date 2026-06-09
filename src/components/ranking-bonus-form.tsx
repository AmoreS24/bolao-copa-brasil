"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Send } from "lucide-react";

type Question = {
  name: string;
  label: string;
  points: number;
  options: string[];
};

const QUESTIONS: Question[] = [
  {
    name: "resposta_resultado",
    label: "A partida termina como?",
    points: 10,
    options: ["Brasil vence", "Marrocos vence", "Empate"]
  },
  {
    name: "resposta_gols",
    label: "Faixa de gols na partida:",
    points: 5,
    options: ["0-2", "3-4", "5-6", "7+"]
  },
  {
    name: "resposta_primeiro_gol",
    label: "Quem faz o primeiro gol?",
    points: 5,
    options: ["Brasil", "Marrocos"]
  },
  {
    name: "resposta_escanteios",
    label: "Faixa de escanteios no jogo:",
    points: 5,
    options: ["0-3", "4-6", "7-10", "11+"]
  },
  {
    name: "resposta_cartoes",
    label: "Faixa de cartões no jogo:",
    points: 5,
    options: ["0-2", "3-5", "6-8", "9+"]
  }
];

export function RankingBonusForm({ paymentId }: { paymentId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/ranking-bonus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          pagamento_id: paymentId,
          ...body
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (payload.alreadyAnswered) {
          setSuccess(true);
          setMessage(payload.message || "Você já ativou sua participação no Ranking da Torcida para este jogo.");
          return;
        }

        throw new Error(payload.error || "Não foi possível salvar suas respostas.");
      }

      setSuccess(true);
      setMessage(payload.message || "Boa sorte! Sua participação foi registrada.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível salvar suas respostas.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="grid gap-4 rounded-lg border border-brasil-green/25 bg-white p-5 shadow-field">
        <p className="rounded-lg bg-brasil-green/10 px-4 py-3 text-lg font-black text-brasil-green">
          {message || "Boa sorte! Sua participação foi registrada."}
        </p>
        <Link href="/dashboard" className="inline-flex w-fit rounded-full bg-brasil-blue px-5 py-3 font-black text-white">
          Ir para meu painel
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      {QUESTIONS.map((question) => (
        <fieldset key={question.name} className="rounded-lg bg-white p-4 shadow-field">
          <legend className="font-black text-brasil-navy">
            {question.label} <span className="text-sm text-brasil-green">({question.points} pontos)</span>
          </legend>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {question.options.map((option) => (
              <label
                key={option}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 font-bold text-slate-700 has-[:checked]:border-brasil-green has-[:checked]:bg-brasil-light"
              >
                <input required type="radio" name={question.name} value={option} className="accent-brasil-green" />
                {option}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      {message ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex min-h-12 w-fit items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field disabled:opacity-60"
      >
        <Send size={18} aria-hidden />
        {loading ? "Enviando..." : "Ativar participação"}
      </button>
    </form>
  );
}

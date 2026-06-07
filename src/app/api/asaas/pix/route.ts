import { NextResponse } from "next/server";
import { nextBrazilMatch } from "@/data/next-match";

type PixRequest = {
  guesses?: Array<{ home: number; away: number }>;
  customer?: {
    name?: string;
    phone?: string;
  };
};

export async function POST(request: Request) {
  const body = (await request.json()) as PixRequest;
  const guesses = body.guesses ?? [];

  if (guesses.length === 0) {
    return NextResponse.json({ error: "Informe pelo menos um palpite." }, { status: 400 });
  }

  const value = guesses.length * nextBrazilMatch.entryValue + nextBrazilMatch.operationalFee;

  return NextResponse.json({
    gateway: "asaas",
    status: "pending",
    paymentId: `asaas_${nextBrazilMatch.id}_${Date.now()}`,
    value,
    pix: {
      encodedImage: null,
      payload: `pix-asaas-${nextBrazilMatch.id}-${guesses.length}-palpites`
    },
    guesses: guesses.map((guess) => ({
      ...guess,
      status: "aguardando_pagamento"
    }))
  });
}

import { NextResponse } from "next/server";
import { getNextMatch } from "@/data/supabase-live";

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
  const match = await getNextMatch();

  if (guesses.length === 0) {
    return NextResponse.json({ error: "Informe pelo menos um palpite." }, { status: 400 });
  }

  if (!match) {
    return NextResponse.json({ error: "Nenhum jogo cadastrado no Supabase." }, { status: 404 });
  }

  const value = guesses.length * match.entryValue + match.operationalFee;

  return NextResponse.json({
    gateway: "asaas",
    status: "pending",
    paymentId: `asaas_${match.id}_${Date.now()}`,
    value,
    pix: {
      encodedImage: null,
      payload: `pix-asaas-${match.id}-${guesses.length}-palpites`
    },
    guesses: guesses.map((guess) => ({
      ...guess,
      status: "aguardando_pagamento"
    }))
  });
}

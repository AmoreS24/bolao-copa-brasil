import { NextResponse } from "next/server";

type AsaasWebhook = {
  event?: string;
  payment?: {
    id?: string;
    status?: string;
  };
};

const paidEvents = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export async function POST(request: Request) {
  const body = (await request.json()) as AsaasWebhook;
  const isPaid = Boolean(body.event && paidEvents.has(body.event));

  return NextResponse.json({
    received: true,
    paymentId: body.payment?.id,
    status: isPaid ? "pago" : "aguardando_pagamento",
    guesses: isPaid ? "confirmados" : "pendentes",
    rankingVote: isPaid ? "liberado" : "bloqueado"
  });
}

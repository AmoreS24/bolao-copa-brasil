import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import { confirmInternalPayment, fetchAsaasPayment, isPaidAsaasStatus } from "@/lib/payment-confirmation";

type DbRow = Record<string, unknown>;

const PAID_PAYMENT_STATUSES = new Set(["paid", "pago", "confirmed", "received", "PAYMENT_RECEIVED"]);

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const user = getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Login necessário." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("id")?.trim() ?? "";

  if (!paymentId) {
    return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("pagamentos")
    .select("id,status,perfil_id,asaas_payment_id")
    .eq("id", paymentId)
    .eq("perfil_id", user.id)
    .maybeSingle();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 400 });
  }

  if (!payment) {
    return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  }

  const { data: guess } = await supabase
    .from("apostas")
    .select("jogo_id")
    .eq("pagamento_id", paymentId)
    .eq("perfil_id", user.id)
    .limit(1)
    .maybeSingle();

  const gameId = asString((guess as DbRow | null)?.jogo_id);
  let rankingAnswered = false;

  if (gameId) {
    const { data: vote } = await supabase
      .from("torcida_votos")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("jogo_id", gameId)
      .maybeSingle();

    rankingAnswered = Boolean(vote);
  }

  const paymentRow = payment as DbRow;
  let status = asString(paymentRow.status) || "pending";

  if (!PAID_PAYMENT_STATUSES.has(status)) {
    const asaasPaymentId = asString(paymentRow.asaas_payment_id);

    if (asaasPaymentId) {
      try {
        const asaasPayment = await fetchAsaasPayment(asaasPaymentId);

        if (isPaidAsaasStatus(asaasPayment.status)) {
          const confirmation = await confirmInternalPayment({
            id: paymentId,
            asaas_payment_id: asaasPaymentId,
            status
          });
          status = asString(confirmation.payment.status) || "paid";
        }
      } catch (error) {
        console.error("[Pagamento Status] erro ao consultar status Asaas", {
          paymentId,
          message: error instanceof Error ? error.message : "erro desconhecido"
        });
      }
    }
  }

  return NextResponse.json({
    status,
    paid: PAID_PAYMENT_STATUSES.has(status),
    rankingAnswered,
    jogo_id: gameId
  });
}

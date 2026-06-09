import { NextResponse } from "next/server";
import {
  confirmInternalPayment,
  fetchAsaasPayment,
  findPaymentByInternalId,
  isPaidAsaasStatus
} from "@/lib/payment-confirmation";

type VerifyPaymentRequest = {
  pagamento_id?: string;
  paymentId?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as VerifyPaymentRequest;
    const paymentId = body.pagamento_id ?? body.paymentId ?? "";

    if (!paymentId) {
      return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 });
    }

    const payment = await findPaymentByInternalId(paymentId);

    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
    }

    const asaasPayment = await fetchAsaasPayment(payment.asaas_payment_id);
    const asaasStatus = asaasPayment.status ?? "";

    console.log("[Pagamento Verificar] status Asaas consultado", {
      paymentId: payment.id,
      asaasPaymentId: payment.asaas_payment_id,
      asaasStatus
    });

    if (!isPaidAsaasStatus(asaasStatus)) {
      return NextResponse.json({
        status: payment.status ?? "pending",
        asaasStatus,
        paid: false,
        message: "Pagamento ainda não identificado. Tente novamente em alguns segundos."
      });
    }

    const confirmation = await confirmInternalPayment(payment);

    console.log("[Pagamento Verificar] pagamento confirmado manualmente", {
      paymentId: payment.id,
      asaasPaymentId: payment.asaas_payment_id,
      asaasStatus,
      confirmedGuessesCount: confirmation.confirmedGuessesCount
    });

    return NextResponse.json({
      status: confirmation.payment.status,
      asaasStatus,
      paid: true,
      confirmedGuessesCount: confirmation.confirmedGuessesCount,
      message: "Pagamento aprovado! Seu palpite foi confirmado."
    });
  } catch (error) {
    console.error("[Pagamento Verificar] erro", error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível verificar o pagamento." },
      { status: 500 }
    );
  }
}

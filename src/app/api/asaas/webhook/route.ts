import { NextResponse } from "next/server";
import { confirmInternalPayment, findPaymentByAsaasId } from "@/lib/payment-confirmation";

type AsaasWebhook = {
  event?: string;
  payment?: string | {
    id?: string;
    status?: string;
  };
  paymentId?: string;
};

const PAID_EVENTS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

function getAsaasPaymentId(body: AsaasWebhook) {
  if (typeof body.payment === "string") {
    return body.payment;
  }

  return body.payment?.id ?? body.paymentId ?? "";
}

export async function POST(request: Request) {
  let body: AsaasWebhook;

  try {
    body = (await request.json()) as AsaasWebhook;
  } catch (error) {
    console.error("[Asaas Webhook] payload inválido", error);
    return NextResponse.json({ received: false, error: "Payload inválido." }, { status: 400 });
  }

  const event = body.event ?? "";
  const asaasPaymentId = getAsaasPaymentId(body);

  console.log("[Asaas Webhook] evento recebido", {
    event,
    asaasPaymentId: asaasPaymentId || null
  });

  if (!asaasPaymentId) {
    console.log("[Asaas Webhook] pagamento não informado", { event });
    return NextResponse.json({ received: true, paymentFound: false });
  }

  if (!PAID_EVENTS.has(event)) {
    console.log("[Asaas Webhook] evento ignorado", {
      event,
      asaasPaymentId
    });

    return NextResponse.json({ received: true, paymentFound: false, ignored: true });
  }

  try {
    const payment = await findPaymentByAsaasId(asaasPaymentId);

    console.log("[Asaas Webhook] pagamento localizado", {
      event,
      asaasPaymentId,
      paymentFound: Boolean(payment),
      internalPaymentId: payment?.id ?? null
    });

    if (!payment) {
      return NextResponse.json({ received: true, paymentFound: false });
    }

    const confirmation = await confirmInternalPayment(payment);

    console.log("[Asaas Webhook] pagamento confirmado", {
      event,
      asaasPaymentId,
      internalPaymentId: payment.id,
      confirmedGuessesCount: confirmation.confirmedGuessesCount
    });

    return NextResponse.json({
      received: true,
      paymentFound: true,
      status: confirmation.payment.status,
      confirmedGuessesCount: confirmation.confirmedGuessesCount
    });
  } catch (error) {
    console.error("[Asaas Webhook] erro ao confirmar pagamento", {
      event,
      asaasPaymentId,
      error
    });

    return NextResponse.json({ received: true, error: "Webhook recebido. Confirmação pendente." });
  }
}

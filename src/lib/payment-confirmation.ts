import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AsaasPaymentResponse = {
  id?: string;
  status?: string;
  errors?: Array<{ description?: string }>;
  [key: string]: unknown;
};

type PaymentRow = {
  id: string;
  asaas_payment_id: string;
  status?: string | null;
};

const PAID_ASAAS_STATUSES = new Set(["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"]);

export function isPaidAsaasStatus(status?: string | null) {
  return Boolean(status && PAID_ASAAS_STATUSES.has(status));
}

function getAsaasBaseUrl() {
  return process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

export async function fetchAsaasPayment(asaasPaymentId: string) {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada.");
  }

  const response = await fetch(`${getAsaasBaseUrl()}/payments/${asaasPaymentId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey
    },
    cache: "no-store"
  });
  const payload = (await response.json().catch(() => ({}))) as AsaasPaymentResponse;

  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.description || "Não foi possível consultar o pagamento no Asaas.");
  }

  return payload;
}

export async function confirmInternalPayment(payment: PaymentRow) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data: updatedPayment, error: paymentError } = await supabase
    .from("pagamentos")
    .update({ status: "paid" })
    .eq("id", payment.id)
    .select("id,status")
    .single();

  if (paymentError || !updatedPayment) {
    throw new Error(paymentError?.message || "Não foi possível confirmar o pagamento.");
  }

  const { data: confirmedGuesses, error: guessesError } = await supabase
    .from("apostas")
    .update({ status: "confirmed" })
    .eq("pagamento_id", payment.id)
    .select("id");

  if (guessesError) {
    throw new Error(guessesError.message);
  }

  return {
    payment: updatedPayment,
    confirmedGuessesCount: confirmedGuesses?.length ?? 0
  };
}

export async function findPaymentByAsaasId(asaasPaymentId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .select("id,asaas_payment_id,status")
    .eq("asaas_payment_id", asaasPaymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PaymentRow | null;
}

export async function findPaymentByInternalId(paymentId: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    throw new Error("Supabase não configurado.");
  }

  const { data, error } = await supabase
    .from("pagamentos")
    .select("id,asaas_payment_id,status")
    .eq("id", paymentId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as PaymentRow | null;
}

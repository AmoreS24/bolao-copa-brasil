import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type ConfirmPaymentRequest = {
  pagamento_id?: string;
};

function isMissingManualColumnsError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST204" || Boolean(error?.message?.includes("confirmado_manualmente"));
}

export async function POST(request: Request) {
  const user = getCurrentUser();

  if (!user || !isMasterUser(user)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const masterUser = user;

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ConfirmPaymentRequest;
  const paymentId = body.pagamento_id?.trim();

  if (!paymentId) {
    return NextResponse.json({ error: "Pagamento não informado." }, { status: 400 });
  }

  const manualConfirmation = {
    status: "paid",
    confirmado_manualmente_em: new Date().toISOString(),
    confirmado_manualmente_por: masterUser.telefone
  };

  let { data: payment, error: paymentError } = await supabase
    .from("pagamentos")
    .update(manualConfirmation)
    .eq("id", paymentId)
    .select("id,status")
    .maybeSingle();

  if (paymentError && isMissingManualColumnsError(paymentError)) {
    const retry = await supabase
      .from("pagamentos")
      .update({ status: "paid" })
      .eq("id", paymentId)
      .select("id,status")
      .maybeSingle();

    payment = retry.data;
    paymentError = retry.error;
  }

  if (paymentError || !payment) {
    return NextResponse.json(
      { error: paymentError?.message ?? "Pagamento não encontrado." },
      { status: paymentError ? 400 : 404 }
    );
  }

  const { data: bets, error: betsError } = await supabase
    .from("apostas")
    .update({ status: "confirmed" })
    .eq("pagamento_id", paymentId)
    .select("id");

  if (betsError) {
    return NextResponse.json({ error: betsError.message }, { status: 400 });
  }

  return NextResponse.json({
    message: "Pagamento confirmado manualmente com sucesso.",
    pagamento: payment,
    apostas_confirmadas: bets?.length ?? 0
  });
}

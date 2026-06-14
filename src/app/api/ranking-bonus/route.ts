import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type RankingBonusRequest = {
  pagamento_id?: string;
  resposta_resultado?: string;
  resposta_gols?: string;
  resposta_primeiro_gol?: string;
  resposta_escanteios?: string;
  resposta_cartoes?: string;
};

const RESULT_OPTIONS = new Set(["Brasil vence", "Empate", "Brasil perde"]);
const GOAL_OPTIONS = new Set(["0 a 1", "2 a 3", "4 a 5", "6+"]);
const FIRST_GOAL_OPTIONS = new Set(["Brasil", "Adversário"]);
const CORNER_OPTIONS = new Set(["0 a 5", "6 a 10", "11+"]);
const CARD_OPTIONS = new Set(["0 a 2", "3 a 5", "6+"]);

function isPaidStatus(status: unknown) {
  return status === "paid" || status === "pago";
}

function isValidPayload(body: RankingBonusRequest) {
  return Boolean(
    body.pagamento_id &&
      body.resposta_resultado &&
      RESULT_OPTIONS.has(body.resposta_resultado) &&
      body.resposta_gols &&
      GOAL_OPTIONS.has(body.resposta_gols) &&
      body.resposta_primeiro_gol &&
      FIRST_GOAL_OPTIONS.has(body.resposta_primeiro_gol) &&
      body.resposta_escanteios &&
      CORNER_OPTIONS.has(body.resposta_escanteios) &&
      body.resposta_cartoes &&
      CARD_OPTIONS.has(body.resposta_cartoes)
  );
}

export async function POST(request: Request) {
  const user = getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Faça login para responder o bônus." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as RankingBonusRequest;

  if (!isValidPayload(body)) {
    return NextResponse.json({ error: "Responda todas as perguntas obrigatórias." }, { status: 400 });
  }

  const { data: payment, error: paymentError } = await supabase
    .from("pagamentos")
    .select("id,perfil_id,status")
    .eq("id", body.pagamento_id)
    .eq("perfil_id", user.id)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.json({ error: "Pagamento não encontrado para este usuário." }, { status: 404 });
  }

  if (!isPaidStatus(payment.status)) {
    return NextResponse.json({ error: "O pagamento precisa estar aprovado para liberar o bônus." }, { status: 403 });
  }

  const { data: guess, error: guessError } = await supabase
    .from("apostas")
    .select("jogo_id")
    .eq("pagamento_id", payment.id)
    .eq("perfil_id", user.id)
    .limit(1)
    .maybeSingle();

  if (guessError || !guess?.jogo_id) {
    return NextResponse.json({ error: "Jogo do pagamento não encontrado." }, { status: 404 });
  }

  const { data: existingVote, error: existingVoteError } = await supabase
    .from("torcida_votos")
    .select("id")
    .eq("perfil_id", user.id)
    .eq("jogo_id", guess.jogo_id)
    .maybeSingle();

  if (existingVoteError) {
    return NextResponse.json({ error: "Não foi possível validar a participação." }, { status: 400 });
  }

  if (existingVote) {
    return NextResponse.json(
      { alreadyAnswered: true, message: "Você já ativou sua participação no Ranking da Torcida para este jogo." },
      { status: 409 }
    );
  }

  const { error: voteError } = await supabase
    .from("torcida_votos")
    .insert({
      perfil_id: user.id,
      jogo_id: guess.jogo_id,
      pagamento_id: payment.id,
      pontos: 0,
      jogos: 1,
      resposta_resultado: body.resposta_resultado,
      resposta_gols: body.resposta_gols,
      resposta_primeiro_gol: body.resposta_primeiro_gol,
      resposta_escanteios: body.resposta_escanteios,
      resposta_cartoes: body.resposta_cartoes
    });

  if (voteError) {
    if (voteError.code === "23505") {
      return NextResponse.json(
        { alreadyAnswered: true, message: "Você já ativou sua participação no Ranking da Torcida para este jogo." },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: voteError.message }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    message: "Boa sorte! Sua participação foi registrada."
  });
}

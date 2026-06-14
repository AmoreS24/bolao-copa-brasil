import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type RankingScoreRequest = {
  jogo_id?: string;
  resultado_oficial?: string;
  primeiro_gol?: string;
  faixa_escanteios?: string;
  faixa_cartoes?: string;
};

type DbRow = Record<string, unknown>;

const RESULT_OPTIONS = new Set(["Brasil vence", "Marrocos vence", "Empate"]);
const FIRST_GOAL_OPTIONS = new Set(["Brasil", "Marrocos"]);
const CORNER_OPTIONS = new Set(["0-3", "4-6", "7-10", "11+"]);
const CARD_OPTIONS = new Set(["0-2", "3-5", "6-8", "9+"]);

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function goalRange(totalGoals: number) {
  if (totalGoals <= 2) {
    return "0-2";
  }

  if (totalGoals <= 4) {
    return "3-4";
  }

  if (totalGoals <= 6) {
    return "5-6";
  }

  return "7+";
}

export async function POST(request: Request) {
  const user = getCurrentUser();

  if (!user || !isMasterUser(user)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as RankingScoreRequest;
  const gameId = body.jogo_id?.trim();
  const officialResult = body.resultado_oficial?.trim() ?? "";
  const firstGoal = body.primeiro_gol?.trim() ?? "";
  const cornerRange = body.faixa_escanteios?.trim() ?? "";
  const cardRange = body.faixa_cartoes?.trim() ?? "";

  if (
    !gameId ||
    !RESULT_OPTIONS.has(officialResult) ||
    !FIRST_GOAL_OPTIONS.has(firstGoal) ||
    !CORNER_OPTIONS.has(cornerRange) ||
    !CARD_OPTIONS.has(cardRange)
  ) {
    return NextResponse.json({ error: "Informe todos os dados oficiais do ranking." }, { status: 400 });
  }

  const { data: game, error: gameError } = await supabase
    .from("jogos")
    .select("id,placar_casa_final,placar_visitante_final")
    .eq("id", gameId)
    .maybeSingle();

  if (gameError || !game) {
    return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
  }

  const finalHome = asNumber(game.placar_casa_final);
  const finalAway = asNumber(game.placar_visitante_final);

  if (finalHome === null || finalAway === null) {
    return NextResponse.json(
      { error: "Encerre a rodada com o placar oficial antes de apurar o ranking." },
      { status: 400 }
    );
  }

  const officialGoalRange = goalRange(finalHome + finalAway);
  const { data: votesData, error: votesError } = await supabase
    .from("torcida_votos")
    .select("id,perfil_id,pontos,pontos_total_rodada,resposta_resultado,resposta_gols,resposta_primeiro_gol,resposta_escanteios,resposta_cartoes")
    .eq("jogo_id", gameId);

  if (votesError) {
    return NextResponse.json({ error: votesError.message }, { status: 400 });
  }

  const votes = (votesData ?? []) as DbRow[];
  const profileIds = Array.from(new Set(votes.map((vote) => asString(vote.perfil_id)).filter(Boolean)));
  const { data: allUserVotesData } = profileIds.length
    ? await supabase
      .from("torcida_votos")
      .select("id,perfil_id,pontos_total_rodada,pontos")
      .in("perfil_id", profileIds)
    : { data: [] };
  const accumulatedBeforeByProfile = new Map<string, number>();

  for (const vote of (allUserVotesData ?? []) as DbRow[]) {
    const profileId = asString(vote.perfil_id);
    accumulatedBeforeByProfile.set(
      profileId,
      (accumulatedBeforeByProfile.get(profileId) ?? 0) + (asNumber(vote.pontos_total_rodada) ?? asNumber(vote.pontos) ?? 0)
    );
  }

  for (const vote of votes) {
    const profileId = asString(vote.perfil_id);
    const oldRoundPoints = asNumber(vote.pontos_total_rodada) ?? asNumber(vote.pontos) ?? 0;
    const pointsResult = asString(vote.resposta_resultado) === officialResult ? 10 : 0;
    const pointsGoals = asString(vote.resposta_gols) === officialGoalRange ? 5 : 0;
    const pointsFirstGoal = asString(vote.resposta_primeiro_gol) === firstGoal ? 5 : 0;
    const pointsCorners = asString(vote.resposta_escanteios) === cornerRange ? 5 : 0;
    const pointsCards = asString(vote.resposta_cartoes) === cardRange ? 5 : 0;
    const roundTotal = pointsResult + pointsGoals + pointsFirstGoal + pointsCorners + pointsCards;
    const accumulatedTotal = (accumulatedBeforeByProfile.get(profileId) ?? 0) - oldRoundPoints + roundTotal;

    const { error: updateError } = await supabase
      .from("torcida_votos")
      .update({
        pontos: roundTotal,
        pontos_resultado: pointsResult,
        pontos_gols: pointsGoals,
        pontos_primeiro_gol: pointsFirstGoal,
        pontos_escanteios: pointsCorners,
        pontos_cartoes: pointsCards,
        pontos_total_rodada: roundTotal,
        pontos_total_acumulado: accumulatedTotal,
        resultado_oficial: officialResult,
        resultado_faixa_gols: officialGoalRange,
        resultado_primeiro_gol: firstGoal,
        resultado_faixa_escanteios: cornerRange,
        resultado_faixa_cartoes: cardRange,
        apurado_em: new Date().toISOString()
      })
      .eq("id", asString(vote.id));

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    message: "Ranking da Torcida apurado com sucesso.",
    votos_apurados: votes.length,
    faixa_gols: officialGoalRange
  });
}

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

const RESULT_OPTIONS = new Set(["Brasil vence", "Empate", "Brasil perde"]);
const FIRST_GOAL_OPTIONS = new Set(["Brasil", "Adversário"]);
const CORNER_OPTIONS = new Set(["0 a 5", "6 a 10", "11+"]);
const CARD_OPTIONS = new Set(["0 a 2", "3 a 5", "6+"]);

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function goalRange(totalGoals: number) {
  if (totalGoals <= 1) {
    return "0 a 1";
  }

  if (totalGoals <= 3) {
    return "2 a 3";
  }

  if (totalGoals <= 5) {
    return "4 a 5";
  }

  return "6+";
}

function resultFromScore(finalHome: number, finalAway: number, homeTeam: string, awayTeam: string) {
  const brazilIsHome = homeTeam.trim().toLowerCase() === "brasil";
  const brazilIsAway = awayTeam.trim().toLowerCase() === "brasil";
  const brazilScore = brazilIsAway ? finalAway : finalHome;
  const opponentScore = brazilIsAway ? finalHome : finalAway;

  if (!brazilIsHome && !brazilIsAway) {
    return finalHome === finalAway ? "Empate" : "Brasil perde";
  }

  if (brazilScore > opponentScore) {
    return "Brasil vence";
  }

  if (brazilScore < opponentScore) {
    return "Brasil perde";
  }

  return "Empate";
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
  const informedOfficialResult = body.resultado_oficial?.trim() ?? "";
  const firstGoal = body.primeiro_gol?.trim() ?? "";
  const cornerRange = body.faixa_escanteios?.trim() ?? "";
  const cardRange = body.faixa_cartoes?.trim() ?? "";

  if (
    !gameId ||
    !RESULT_OPTIONS.has(informedOfficialResult) ||
    !FIRST_GOAL_OPTIONS.has(firstGoal) ||
    !CORNER_OPTIONS.has(cornerRange) ||
    !CARD_OPTIONS.has(cardRange)
  ) {
    return NextResponse.json({ error: "Informe todos os dados oficiais do ranking." }, { status: 400 });
  }

  const { data: game, error: gameError } = await supabase
    .from("jogos")
    .select("id,time_da_casa,time_visitante,placar_casa_final,placar_visitante_final")
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
  const officialResult = resultFromScore(finalHome, finalAway, game.time_da_casa, game.time_visitante);
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

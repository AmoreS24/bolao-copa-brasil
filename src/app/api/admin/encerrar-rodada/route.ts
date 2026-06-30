import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type CloseRoundRequest = {
  jogo_id?: string;
  gols_casa?: number;
  gols_visitante?: number;
  valor_premio?: number;
};

type DbRow = Record<string, unknown>;

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;

  if (normalized.length <= 4) {
    return "*****";
  }

  return `${normalized.slice(0, 2)}*****${normalized.slice(-2)}`;
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

  const body = (await request.json().catch(() => ({}))) as CloseRoundRequest;
  const gameId = body.jogo_id?.trim();
  const finalHome = asNumber(body.gols_casa);
  const finalAway = asNumber(body.gols_visitante);
  const prizeValue = asNumber(body.valor_premio) ?? 0;

  if (!gameId || finalHome === null || finalAway === null || finalHome < 0 || finalAway < 0) {
    return NextResponse.json({ error: "Informe jogo e placar oficial." }, { status: 400 });
  }

  const { data: betsData, error: betsError } = await supabase
    .from("apostas")
    .select("id,perfil_id,gols_brasil,gols_adversario")
    .eq("jogo_id", gameId)
    .eq("status", "confirmed");

  if (betsError) {
    return NextResponse.json({ error: betsError.message }, { status: 400 });
  }

  const bets = (betsData ?? []) as DbRow[];
  const winnerBets = bets.filter((bet) => asNumber(bet.gols_brasil) === finalHome && asNumber(bet.gols_adversario) === finalAway);
  const winnerBetIds = new Set(winnerBets.map((bet) => asString(bet.id)));
  const winnerPrize = winnerBets.length > 0 ? Number((prizeValue / winnerBets.length).toFixed(2)) : 0;

  await supabase.from("rodada_vencedores").delete().eq("jogo_id", gameId);

  const { error: gameError } = await supabase
    .from("jogos")
    .update({
      status_jogo: "encerrado",
      placar_casa_final: finalHome,
      placar_visitante_final: finalAway,
      encerrado_em: new Date().toISOString(),
      premio_acumulado: winnerBets.length > 0 ? 0 : prizeValue,
      premio_total_exibido: winnerBets.length > 0 ? 200 : 200 + prizeValue
    })
    .eq("id", gameId);

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 400 });
  }

  await Promise.all(
    bets.map((bet) =>
      supabase
        .from("apostas")
        .update({ resultado_status: winnerBetIds.has(asString(bet.id)) ? "vencedor" : "perdedor" })
        .eq("id", asString(bet.id))
    )
  );

  let winnersPayload: Array<{
    jogo_id: string;
    aposta_id: string;
    perfil_id: string;
    nome: string;
    telefone_mascarado: string;
    palpite_casa: number;
    palpite_visitante: number;
    valor_premio: number;
  }> = [];

  if (winnerBets.length > 0) {
    const profileIds = Array.from(new Set(winnerBets.map((bet) => asString(bet.perfil_id)).filter(Boolean)));
    const { data: profilesData } = profileIds.length
      ? await supabase.from("perfis").select("id,nome,telefone").in("id", profileIds)
      : { data: [] };
    const profilesById = new Map(((profilesData ?? []) as DbRow[]).map((profile) => [asString(profile.id), profile]));

    winnersPayload = winnerBets.map((bet) => {
      const profile = profilesById.get(asString(bet.perfil_id)) ?? {};

      return {
        jogo_id: gameId,
        aposta_id: asString(bet.id),
        perfil_id: asString(bet.perfil_id),
        nome: asString(profile.nome) || "Vencedor",
        telefone_mascarado: maskPhone(asString(profile.telefone)),
        palpite_casa: asNumber(bet.gols_brasil) ?? 0,
        palpite_visitante: asNumber(bet.gols_adversario) ?? 0,
        valor_premio: winnerPrize
      };
    });

    const { error: winnersError } = await supabase.from("rodada_vencedores").insert(winnersPayload);

    if (winnersError) {
      return NextResponse.json({ error: winnersError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    message: winnerBets.length > 0 ? "Rodada encerrada com vencedores." : "Rodada encerrada e acumulada.",
    participacoes_confirmadas: bets.length,
    vencedores: winnerBets.length,
    valor_por_vencedor: winnerPrize,
    valor_total_premiacao: prizeValue,
    lista_vencedores: winnersPayload.map((winner) => ({
      nome: winner.nome,
      telefone: winner.telefone_mascarado,
      palpite: `${winner.palpite_casa} x ${winner.palpite_visitante}`,
      valor: winner.valor_premio
    }))
  });
}

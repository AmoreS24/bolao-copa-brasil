import { NextResponse } from "next/server";
import { getCurrentFallbackRound } from "@/data/supabase-live";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type VisitRequest = {
  jogo_id?: string;
  visitante_id?: string;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function minutesBefore(value: string, minutes: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Date(date.getTime() - minutes * 60 * 1000).toISOString();
}

async function resolveVisitGameId(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, gameId: string) {
  if (isUuid(gameId)) {
    return gameId;
  }

  const fallbackRound = getCurrentFallbackRound();
  const startsAtDate = fallbackRound.startsAt.slice(0, 10);
  const { data: existingRows } = await supabase
    .from("jogos")
    .select("id")
    .eq("time_da_casa", fallbackRound.homeTeam)
    .eq("time_visitante", fallbackRound.awayTeam)
    .gte("data_de_correspondencia", `${startsAtDate}T00:00:00-03:00`)
    .lt("data_de_correspondencia", "2026-06-30T00:00:00-03:00")
    .limit(1);

  const existing = Array.isArray(existingRows) ? existingRows[0] : null;

  if (existing?.id && typeof existing.id === "string") {
    await supabase
      .from("jogos")
      .update({
        status_jogo: "aberto",
        apostas_encerram_em: minutesBefore(fallbackRound.startsAt, 15)
      })
      .eq("id", existing.id);

    return existing.id;
  }

  const { data: created } = await supabase
    .from("jogos")
    .insert({
      time_da_casa: fallbackRound.homeTeam,
      time_visitante: fallbackRound.awayTeam,
      data_de_correspondencia: fallbackRound.startsAt,
      apostas_encerram_em: minutesBefore(fallbackRound.startsAt, 15),
      status_jogo: "aberto",
      local: fallbackRound.venue,
      cidade: fallbackRound.city,
      grupo: fallbackRound.group,
      premio_garantido: fallbackRound.guaranteedPrize,
      premio_total_exibido: fallbackRound.guaranteedPrize,
      valor_palpite: 10
    })
    .select("id")
    .single();

  return typeof created?.id === "string" ? created.id : "";
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as VisitRequest;
  const rawGameId = body.jogo_id?.trim() ?? "";
  const visitorId = body.visitante_id?.trim() ?? "";

  if (!rawGameId || !/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const gameId = await resolveVisitGameId(supabase, rawGameId);

  if (!gameId) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const { data: game } = await supabase
    .from("jogos")
    .select("id")
    .eq("id", gameId)
    .eq("status_jogo", "aberto")
    .maybeSingle();

  if (!game) {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  const { error } = await supabase
    .from("rodada_visitantes")
    .upsert(
      { jogo_id: gameId, visitante_id: visitorId },
      { onConflict: "jogo_id,visitante_id", ignoreDuplicates: true }
    );

  return NextResponse.json({ ok: !error });
}

import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type VisitRequest = {
  jogo_id?: string;
  visitante_id?: string;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as VisitRequest;
  const gameId = body.jogo_id?.trim() ?? "";
  const visitorId = body.visitante_id?.trim() ?? "";

  if (!gameId || !/^[a-zA-Z0-9-]{16,64}$/.test(visitorId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
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

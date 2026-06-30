import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type GameStatus = "aguardando" | "aberto" | "encerrado";

type GameRequest = {
  action?: "save" | "open" | "close" | "delete";
  id?: string;
  time_da_casa?: string;
  time_visitante?: string;
  data_de_correspondencia?: string;
  local?: string;
  cidade?: string;
  grupo?: string;
  premio_garantido?: number | string;
  valor_palpite?: number | string;
  status_jogo?: GameStatus;
};

const GAME_STATUSES = new Set<GameStatus>(["aguardando", "aberto", "encerrado"]);

function clean(value?: string) {
  return value?.trim() ?? "";
}

function asNumber(value: unknown, fallback: number) {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toStoredDate(value: string) {
  if (!value) {
    return "";
  }

  return value.length === 16 ? `${value}:00-03:00` : value;
}

function minutesBefore(value: string, minutes: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
}

async function ensureSingleOpenRound(supabase: NonNullable<ReturnType<typeof getSupabaseServerClient>>, id?: string) {
  let query = supabase
    .from("jogos")
    .update({ status_jogo: "aguardando" })
    .eq("status_jogo", "aberto");

  if (id) {
    query = query.neq("id", id);
  }

  return query;
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

  const body = (await request.json().catch(() => ({}))) as GameRequest;
  const action = body.action ?? "save";
  const id = clean(body.id);

  if ((action === "open" || action === "close" || action === "delete") && !id) {
    return NextResponse.json({ error: "Jogo não encontrado." }, { status: 400 });
  }

  if (action === "delete") {
    const { count: linkedBets } = await supabase
      .from("apostas")
      .select("id", { count: "exact", head: true })
      .eq("jogo_id", id);

    if ((linkedBets ?? 0) > 0) {
      return NextResponse.json({ error: "Esta rodada possui apostas vinculadas e não pode ser excluída." }, { status: 400 });
    }

    const { error } = await supabase
      .from("jogos")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "open") {
    const { data: currentGame } = await supabase
      .from("jogos")
      .select("status_jogo")
      .eq("id", id)
      .maybeSingle();

    if (currentGame?.status_jogo === "encerrado") {
      return NextResponse.json({ error: "Jogo encerrado não pode ser reaberto para palpites." }, { status: 400 });
    }

    const closeOthers = await ensureSingleOpenRound(supabase, id);

    if (closeOthers.error) {
      return NextResponse.json({ error: closeOthers.error.message }, { status: 400 });
    }

    const { error } = await supabase
      .from("jogos")
      .update({ status_jogo: "aberto", aberto_em: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  if (action === "close") {
    const { error } = await supabase
      .from("jogos")
      .update({
        status_jogo: "encerrado",
        encerrado_em: new Date().toISOString()
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  }

  const homeTeam = clean(body.time_da_casa);
  const awayTeam = clean(body.time_visitante);
  const startsAt = toStoredDate(clean(body.data_de_correspondencia));
  const status = GAME_STATUSES.has(body.status_jogo ?? "aguardando") ? body.status_jogo ?? "aguardando" : "aguardando";
  const bettingClosesAt = minutesBefore(startsAt, 15);

  if (!homeTeam || !awayTeam || !startsAt || !bettingClosesAt) {
    return NextResponse.json({ error: "Informe times, data e horário do jogo." }, { status: 400 });
  }

  if (id && status === "aberto") {
    const { data: currentGame } = await supabase
      .from("jogos")
      .select("status_jogo")
      .eq("id", id)
      .maybeSingle();

    if (currentGame?.status_jogo === "encerrado") {
      return NextResponse.json({ error: "Jogo encerrado não pode ser reaberto para palpites." }, { status: 400 });
    }
  }

  if (status === "aberto") {
    const closeOthers = await ensureSingleOpenRound(supabase, id || undefined);

    if (closeOthers.error) {
      return NextResponse.json({ error: closeOthers.error.message }, { status: 400 });
    }
  }

  const payload = {
    time_da_casa: homeTeam,
    time_visitante: awayTeam,
    data_de_correspondencia: startsAt,
    apostas_encerram_em: bettingClosesAt,
    status_jogo: status,
    local: clean(body.local),
    cidade: clean(body.cidade),
    grupo: clean(body.grupo),
    premio_garantido: asNumber(body.premio_garantido, 200),
    premio_total_exibido: asNumber(body.premio_garantido, 200),
    valor_palpite: asNumber(body.valor_palpite, 10),
    ...(status === "aberto" ? { aberto_em: new Date().toISOString() } : {})
  };

  const query = id
    ? supabase.from("jogos").update(payload).eq("id", id)
    : supabase.from("jogos").insert(payload);

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

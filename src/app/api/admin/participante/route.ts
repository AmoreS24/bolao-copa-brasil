import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DbRow = Record<string, unknown>;

const PAID_PAYMENT_STATUSES = ["paid", "confirmed", "received", "PAYMENT_RECEIVED"];

function stringValue(row: DbRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return fallback;
}

function numberValue(row: DbRow, keys: string[], fallback = 0) {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string") {
      const parsed = Number(value.replace(",", "."));

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function dateTimeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function cleanSearch(value: string) {
  return value.replace(/[%,]/g, "").trim();
}

export async function GET(request: Request) {
  const user = getCurrentUser();

  if (!user || !isMasterUser(user)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const url = new URL(request.url);
  const id = cleanSearch(url.searchParams.get("id") ?? "");
  const q = cleanSearch(url.searchParams.get("q") ?? "");
  const digits = q.replace(/\D/g, "");

  if (!id && q.length < 2) {
    return NextResponse.json({ participants: [] });
  }

  const profileQuery = supabase
    .from("perfis")
    .select("id,nome,telefone,cpf,origem_ref,criado_em")
    .order("criado_em", { ascending: false })
    .limit(id ? 1 : 8);

  const { data: profilesData, error: profilesError } = id
    ? await profileQuery.eq("id", id)
    : await profileQuery.or(`nome.ilike.%${q}%,telefone.ilike.%${digits || q}%,cpf.ilike.%${digits || q}%`);

  if (profilesError) {
    return NextResponse.json({ error: profilesError.message }, { status: 400 });
  }

  const profiles = (profilesData ?? []) as DbRow[];
  const profileIds = profiles.map((profile) => stringValue(profile, ["id"])).filter(Boolean);

  if (profileIds.length === 0) {
    return NextResponse.json({ participants: [] });
  }

  const [{ data: betsData }, { data: paymentsData }, { data: prizesData }] = await Promise.all([
    supabase
      .from("apostas")
      .select("id,perfil_id,jogo_id,pagamento_id,gols_brasil,gols_adversario,status,resultado_status,criado_em,jogos(time_da_casa,time_visitante,data_de_correspondencia,status_jogo)")
      .in("perfil_id", profileIds)
      .order("criado_em", { ascending: false })
      .limit(80),
    supabase
      .from("pagamentos")
      .select("id,perfil_id,status,valor_total,criado_em")
      .in("perfil_id", profileIds)
      .order("criado_em", { ascending: false })
      .limit(80),
    supabase
      .from("rodada_vencedores")
      .select("id,perfil_id,jogo_id,nome,valor_premio,criado_em")
      .in("perfil_id", profileIds)
      .order("criado_em", { ascending: false })
      .limit(80)
  ]);

  const bets = (betsData ?? []) as DbRow[];
  const payments = (paymentsData ?? []) as DbRow[];
  const prizes = (prizesData ?? []) as DbRow[];

  const participants = profiles.map((profile) => {
    const profileId = stringValue(profile, ["id"]);
    const profileBets = bets.filter((bet) => stringValue(bet, ["perfil_id"]) === profileId);
    const profilePayments = payments.filter((payment) => stringValue(payment, ["perfil_id"]) === profileId);
    const profilePrizes = prizes.filter((prize) => stringValue(prize, ["perfil_id"]) === profileId);
    const paidPayments = profilePayments.filter((payment) => PAID_PAYMENT_STATUSES.includes(stringValue(payment, ["status"])));
    const rounds = new Set(profileBets.map((bet) => stringValue(bet, ["jogo_id"])).filter(Boolean));

    return {
      id: profileId,
      nome: stringValue(profile, ["nome"], "Participante"),
      telefone: stringValue(profile, ["telefone"]),
      cpf: stringValue(profile, ["cpf"]),
      origem_ref: stringValue(profile, ["origem_ref"], "-") || "-",
      criado_em: dateTimeLabel(stringValue(profile, ["criado_em"])),
      rodadas_participadas: rounds.size,
      total_pago: paidPayments.reduce((total, payment) => total + numberValue(payment, ["valor_total"], 0), 0),
      premios_recebidos: profilePrizes.reduce((total, prize) => total + numberValue(prize, ["valor_premio"], 0), 0),
      palpites: profileBets.map((bet) => {
        const game = (bet.jogos ?? {}) as DbRow;

        return {
          id: stringValue(bet, ["id"]),
          jogo: `${stringValue(game, ["time_da_casa"], "Brasil")} x ${stringValue(game, ["time_visitante"], "Adversário")}`,
          data: dateTimeLabel(stringValue(game, ["data_de_correspondencia"])),
          placar: `${numberValue(bet, ["gols_brasil"], 0)} x ${numberValue(bet, ["gols_adversario"], 0)}`,
          status: stringValue(bet, ["status"], "pending_payment"),
          resultado: stringValue(bet, ["resultado_status"], "aguardando"),
          criado_em: dateTimeLabel(stringValue(bet, ["criado_em"]))
        };
      }),
      pagamentos: profilePayments.map((payment) => ({
        id: stringValue(payment, ["id"]),
        status: stringValue(payment, ["status"], "pending"),
        valor: numberValue(payment, ["valor_total"], 0),
        criado_em: dateTimeLabel(stringValue(payment, ["criado_em"]))
      })),
      premios: profilePrizes.map((prize) => ({
        id: stringValue(prize, ["id"]),
        valor: numberValue(prize, ["valor_premio"], 0),
        criado_em: dateTimeLabel(stringValue(prize, ["criado_em"]))
      }))
    };
  });

  return NextResponse.json({ participants });
}

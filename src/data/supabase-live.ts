import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DbRow = Record<string, unknown>;

export type LiveMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  correspondenceDate: string;
  startsAt: string;
  bettingClosesAt: string;
  dateLabel: string;
  timeLabel: string;
  bettingClosesLabel: string;
  venue: string;
  competition: string;
  group: string;
  entryValue: number;
  operationalFee: number;
  exactPool: number;
  rankingPool: number;
  confirmedGuesses: number;
  spotsLeft: number;
  scoreExamples: Array<{ brazil: number; opponent: number }>;
};

export type LiveRankingPlayer = {
  position: number;
  name: string;
  points: number;
  games: number;
};

export type LiveUserHistory = {
  match: string;
  guess: string;
  points: number;
  status: string;
};

export type AdminBetFilter = "todos" | "confirmados" | "pendentes";

export type AdminBetRow = {
  id: string;
  paymentId: string;
  userName: string;
  userPhone: string;
  originRef: string;
  match: string;
  guess: string;
  betStatus: string;
  paymentStatus: string;
  paidValue: number;
  createdAtLabel: string;
  filterStatus: Exclude<AdminBetFilter, "todos"> | "outros";
  canConfirmManually: boolean;
};

export type AdminAffiliateRow = {
  originRef: string;
  signups: number;
  confirmedPayments: number;
  paidTotal: number;
};

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;
const MINIMUM_DISPLAY_PRIZE = 200;
const DEFAULT_CAPACITY = 400;
const DEFAULT_COMPETITION = "Copa do Mundo 2026";
const GAME_COLUMNS = "id,time_da_casa,time_visitante,data_de_correspondencia,apostas_encerram_em";
const PAID_PAYMENT_STATUSES = ["paid", "confirmed", "received", "PAYMENT_RECEIVED"];
const PENDING_PAYMENT_STATUSES = ["pending", "pending_payment", "aguardando_pagamento"];

function getSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false
    }
  });
}

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

function dateLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function timeLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo"
  }).format(date)} (Brasília)`;
}

function shortTimeLabel(value: string) {
  return timeLabel(value).replace(":00", "").replace(" (Brasília)", "h");
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

function minutesBefore(value: string, minutes: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Date(date.getTime() - minutes * 60 * 1000).toISOString();
}

function slugFromTeams(homeTeam: string, awayTeam: string) {
  return `${homeTeam}-${awayTeam}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function displayedPrize(confirmedGuesses: number, entryValue: number) {
  return Math.max(MINIMUM_DISPLAY_PRIZE, confirmedGuesses * entryValue);
}

function matchFromRow(row: DbRow, confirmedGuesses: number, index = 0): LiveMatch {
  const homeTeam = stringValue(row, ["time_da_casa", "home_team", "mandante", "casa"], "Brasil");
  const awayTeam = stringValue(row, ["time_visitante", "away_team", "visitante", "adversario"], "Adversário");
  const startsAt = stringValue(
    row,
    ["data_de_correspondencia", "starts_at", "data", "data_jogo"],
    new Date().toISOString()
  );
  const bettingClosesAt = minutesBefore(startsAt, 15);
  const capacity = numberValue(row, ["limite_apostas", "capacidade", "vagas"], DEFAULT_CAPACITY);
  const entryValue = numberValue(row, ["valor_palpite", "entry_value"], ENTRY_VALUE);
  const operationalFee = numberValue(row, ["taxa_operacional", "operational_fee"], OPERATIONAL_FEE);

  return {
    id: stringValue(row, ["id", "slug"], slugFromTeams(homeTeam, awayTeam)),
    homeTeam,
    awayTeam,
    correspondenceDate: startsAt,
    startsAt,
    bettingClosesAt,
    dateLabel: dateLabel(startsAt),
    timeLabel: timeLabel(startsAt),
    bettingClosesLabel: shortTimeLabel(bettingClosesAt),
    venue: stringValue(row, ["local", "estadio", "venue"], "Estádio a confirmar"),
    competition: stringValue(row, ["competicao", "competition"], DEFAULT_COMPETITION),
    group: stringValue(row, ["grupo", "group"], index === 0 ? "Próximo jogo" : "Jogo do Brasil"),
    entryValue,
    operationalFee,
    exactPool: displayedPrize(confirmedGuesses, entryValue),
    rankingPool: numberValue(row, ["premio_torcida", "ranking_pool"], 0),
    confirmedGuesses,
    spotsLeft: Math.max(capacity - confirmedGuesses, 0),
    scoreExamples: [
      { brazil: 1, opponent: 0 },
      { brazil: 2, opponent: 1 },
      { brazil: 3, opponent: 0 }
    ]
  };
}

export async function getPrizeValue() {
  const confirmedGuesses = await getConfirmedGuessesCount();
  return displayedPrize(confirmedGuesses, ENTRY_VALUE);
}

export async function getConfirmedGuessesCount(matchId?: string) {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return 0;
  }

  let query = supabase
    .from("apostas")
    .select("id", { count: "exact", head: true })
    .eq("status", "confirmed");

  if (matchId) {
    query = query.eq("jogo_id", matchId);
  }

  const { count, error } = await query;

  return error ? 0 : count ?? 0;
}

export async function getUpcomingMatches() {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("jogos")
    .select(GAME_COLUMNS as "*");

  if (error) {
    return [];
  }

  const rows = (data ?? []) as DbRow[];

  return Promise.all(
    rows.map(async (row, index) => {
      const id = stringValue(row, ["id", "slug"]);
      const confirmedGuesses = await getConfirmedGuessesCount(id);
      return matchFromRow(row, confirmedGuesses, index);
    })
  );
}

export async function getNextMatch() {
  const matches = await getUpcomingMatches();
  return matches[0] ?? null;
}

export async function getMatchById(id: string) {
  const matches = await getUpcomingMatches();
  return matches.find((match) => match.id === id || slugFromTeams(match.homeTeam, match.awayTeam) === id) ?? null;
}

export async function getRankingPlayers(limit = 10): Promise<LiveRankingPlayer[]> {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("torcida_votos")
    .select("*, perfis(*)")
    .limit(limit);

  if (error) {
    return [];
  }

  const rows = ((data ?? []) as DbRow[]).map((row, index) => {
    const profile = (row.perfis ?? {}) as DbRow;

    return {
      position: index + 1,
      name: stringValue(profile, ["nome", "name"], stringValue(row, ["nome", "name"], "Participante")),
      points: numberValue(row, ["pontos", "points", "pontuacao"], 0),
      games: numberValue(row, ["jogos", "games", "participacoes"], 1)
    };
  });

  return rows.sort((a, b) => b.points - a.points).map((player, index) => ({ ...player, position: index + 1 }));
}

export async function getAdminStats() {
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();
  const [matches, prize] = await Promise.all([getUpcomingMatches(), getPrizeValue()]);

  if (!supabase) {
    return {
      matches,
      prize,
      users: 0,
      paymentsConfirmed: 0,
      paymentsPending: 0,
      conversionRate: 0,
      paidTotal: 0,
      bets: [] as AdminBetRow[],
      topAffiliates: [] as AdminAffiliateRow[]
    };
  }

  const [{ count: users }, { count: paymentsPending }, { data: paidPayments }, { data: referralProfiles }] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }),
    supabase.from("pagamentos").select("id", { count: "exact", head: true }).in("status", PENDING_PAYMENT_STATUSES),
    supabase.from("pagamentos").select("id,valor_total,origem_ref").in("status", PAID_PAYMENT_STATUSES),
    supabase.from("perfis").select("origem_ref")
  ]);

  const usersCount = users ?? 0;
  const confirmedPaymentsRows = (paidPayments ?? []) as DbRow[];
  const paymentsConfirmed = confirmedPaymentsRows.length;
  const paidTotal = ((paidPayments ?? []) as DbRow[]).reduce(
    (total, payment) => total + numberValue(payment, ["valor_total"], 0),
    0
  );
  const affiliateStats = new Map<string, AdminAffiliateRow>();

  for (const profile of (referralProfiles ?? []) as DbRow[]) {
    const originRef = stringValue(profile, ["origem_ref"]);

    if (!originRef) {
      continue;
    }

    const current = affiliateStats.get(originRef) ?? {
      originRef,
      signups: 0,
      confirmedPayments: 0,
      paidTotal: 0
    };

    current.signups += 1;
    affiliateStats.set(originRef, current);
  }

  for (const payment of confirmedPaymentsRows) {
    const originRef = stringValue(payment, ["origem_ref"]);

    if (!originRef) {
      continue;
    }

    const current = affiliateStats.get(originRef) ?? {
      originRef,
      signups: 0,
      confirmedPayments: 0,
      paidTotal: 0
    };

    current.confirmedPayments += 1;
    current.paidTotal += numberValue(payment, ["valor_total"], 0);
    affiliateStats.set(originRef, current);
  }

  const topAffiliates = Array.from(affiliateStats.values())
    .sort((a, b) => b.paidTotal - a.paidTotal || b.confirmedPayments - a.confirmedPayments || b.signups - a.signups)
    .slice(0, 10);

  const { data: betsData } = await supabase
    .from("apostas")
    .select("id,pagamento_id,perfil_id,jogo_id,gols_brasil,gols_adversario,status,criado_em")
    .order("criado_em", { ascending: false })
    .limit(200);

  const betsRows = (betsData ?? []) as DbRow[];
  const profileIds = Array.from(new Set(betsRows.map((row) => stringValue(row, ["perfil_id"])).filter(Boolean)));
  const paymentIds = Array.from(new Set(betsRows.map((row) => stringValue(row, ["pagamento_id"])).filter(Boolean)));
  const matchIds = Array.from(new Set(betsRows.map((row) => stringValue(row, ["jogo_id"])).filter(Boolean)));

  const [{ data: profilesData }, { data: paymentsData }, { data: gamesData }] = await Promise.all([
    profileIds.length
      ? supabase.from("perfis").select("id,nome,telefone,origem_ref").in("id", profileIds)
      : Promise.resolve({ data: [] }),
    paymentIds.length
      ? supabase.from("pagamentos").select("id,status,valor_total,origem_ref,criado_em").in("id", paymentIds)
      : Promise.resolve({ data: [] }),
    matchIds.length
      ? supabase.from("jogos").select(GAME_COLUMNS as "*").in("id", matchIds)
      : Promise.resolve({ data: [] })
  ]);

  const profilesById = new Map(((profilesData ?? []) as DbRow[]).map((row) => [stringValue(row, ["id"]), row]));
  const paymentsById = new Map(((paymentsData ?? []) as DbRow[]).map((row) => [stringValue(row, ["id"]), row]));
  const gamesById = new Map(((gamesData ?? []) as DbRow[]).map((row) => [stringValue(row, ["id"]), row]));

  const bets = betsRows.map((bet): AdminBetRow => {
    const profile = profilesById.get(stringValue(bet, ["perfil_id"])) ?? {};
    const paymentId = stringValue(bet, ["pagamento_id"]);
    const payment = paymentsById.get(paymentId) ?? {};
    const game = gamesById.get(stringValue(bet, ["jogo_id"])) ?? {};
    const betStatus = stringValue(bet, ["status"], "pending_payment");
    const paymentStatus = stringValue(payment, ["status"], "pending");
    const isConfirmed = betStatus === "confirmed" || PAID_PAYMENT_STATUSES.includes(paymentStatus);
    const isPending = betStatus === "pending_payment" || PENDING_PAYMENT_STATUSES.includes(paymentStatus);

    return {
      id: stringValue(bet, ["id"]),
      paymentId,
      userName: stringValue(profile, ["nome"], "Participante"),
      userPhone: stringValue(profile, ["telefone"], ""),
      originRef: stringValue(payment, ["origem_ref"], stringValue(profile, ["origem_ref"], "-")) || "-",
      match: `${stringValue(game, ["time_da_casa"], "Brasil")} x ${stringValue(game, ["time_visitante"], "Adversário")}`,
      guess: `${numberValue(bet, ["gols_brasil"], 0)} x ${numberValue(bet, ["gols_adversario"], 0)}`,
      betStatus,
      paymentStatus,
      paidValue: numberValue(payment, ["valor_total"], 0),
      createdAtLabel: dateTimeLabel(stringValue(bet, ["criado_em"], stringValue(payment, ["criado_em"]))),
      filterStatus: isConfirmed ? "confirmados" : isPending ? "pendentes" : "outros",
      canConfirmManually: Boolean(paymentId && isPending && !isConfirmed)
    };
  });

  return {
    matches,
    prize,
    users: usersCount,
    paymentsConfirmed,
    paymentsPending: paymentsPending ?? 0,
    conversionRate: usersCount > 0 ? Math.round((paymentsConfirmed / usersCount) * 100) : 0,
    paidTotal,
    bets,
    topAffiliates
  };
}

export async function getProfileSummary() {
  const supabase = getSupabaseServer();
  const user = getCurrentUser();

  if (!supabase || !user) {
    return {
      name: "Participante",
      phone: "",
      history: [] as LiveUserHistory[]
    };
  }

  const [{ data: profile }, { data: guesses }] = await Promise.all([
    supabase.from("perfis").select("id,nome,telefone").eq("id", user.id).maybeSingle(),
    supabase.from("apostas").select("*, jogos(*)").eq("perfil_id", user.id).limit(10)
  ]);

  const profileRow = (profile ?? {}) as DbRow;
  const history = ((guesses ?? []) as DbRow[]).map((guess) => {
    const game = (guess.jogos ?? {}) as DbRow;
    const homeTeam = stringValue(game, ["time_da_casa"], "Brasil");
    const awayTeam = stringValue(game, ["time_visitante"], "Adversário");
    const homeScore = numberValue(guess, ["gols_casa", "brasil_goals", "placar_casa"], 0);
    const awayScore = numberValue(guess, ["gols_visitante", "opponent_goals", "placar_visitante"], 0);

    return {
      match: `${homeTeam} x ${awayTeam}`,
      guess: `${homeScore} x ${awayScore}`,
      points: numberValue(guess, ["pontos", "points"], 0),
      status: stringValue(guess, ["status", "payment_status"], "Aguardando resultado")
    };
  });

  return {
    name: stringValue(profileRow, ["nome", "name"], "Participante"),
    phone: stringValue(profileRow, ["telefone", "phone", "whatsapp_phone"], ""),
    history
  };
}

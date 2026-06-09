import "server-only";
import { createClient } from "@supabase/supabase-js";

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

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;
const MINIMUM_DISPLAY_PRIZE = 200;
const DEFAULT_CAPACITY = 400;
const DEFAULT_COMPETITION = "Copa do Mundo 2026";
const GAME_COLUMNS = "id,time_da_casa,time_visitante,data_de_correspondencia,apostas_encerram_em";

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
  const supabase = getSupabaseServer();
  const [matches, prize] = await Promise.all([getUpcomingMatches(), getPrizeValue()]);

  if (!supabase) {
    return { matches, prize, users: 0, paymentsPending: 0, paidTotal: 0 };
  }

  const [{ count: users }, { count: paymentsPending }, { data: paidPayments }] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }),
    supabase.from("pagamentos").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    supabase.from("pagamentos").select("*").eq("status", "pago")
  ]);

  const paidTotal = ((paidPayments ?? []) as DbRow[]).reduce(
    (total, payment) => total + numberValue(payment, ["valor", "amount", "total"], 0),
    0
  );

  return {
    matches,
    prize,
    users: users ?? 0,
    paymentsPending: paymentsPending ?? 0,
    paidTotal
  };
}

export async function getProfileSummary() {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return {
      name: "Participante",
      phone: "",
      history: [] as LiveUserHistory[]
    };
  }

  const [{ data: profile }, { data: guesses }] = await Promise.all([
    supabase.from("perfis").select("*").limit(1).maybeSingle(),
    supabase.from("apostas").select("*, jogos(*)").limit(10)
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

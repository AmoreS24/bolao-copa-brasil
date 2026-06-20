import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type DbRow = Record<string, unknown>;

export type LiveMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  status: "aguardando" | "aberto" | "em_andamento" | "encerrado";
  correspondenceDate: string;
  startsAt: string;
  bettingClosesAt: string;
  dateLabel: string;
  timeLabel: string;
  bettingClosesLabel: string;
  venue: string;
  city: string;
  competition: string;
  group: string;
  entryValue: number;
  operationalFee: number;
  exactPool: number;
  guaranteedPrize: number;
  accumulatedPrize: number;
  displayedPrizeTotal: number;
  finalHomeScore: number | null;
  finalAwayScore: number | null;
  officialResult: string;
  hasFinalResult: boolean;
  rankingPool: number;
  confirmedGuesses: number;
  spotsLeft: number;
  scoreExamples: Array<{ brazil: number; opponent: number }>;
};

export type LiveRankingPlayer = {
  position: number;
  profileId: string;
  name: string;
  points: number;
  games: number;
};

export type LiveUserHistory = {
  match: string;
  dateLabel: string;
  guess: string;
  officialResult: string;
  points: number;
  status: string;
  rankingBreakdown?: LiveRankingBreakdown;
};

export type LiveRankingBreakdown = {
  match: string;
  dateLabel: string;
  total: number;
  accumulated: number;
  resultado: number;
  gols: number;
  primeiroGol: number;
  escanteios: number;
  cartoes: number;
};

export type LiveRankingRoundDetail = LiveRankingBreakdown & {
  id: string;
  name: string;
};

export type LiveParticipantPerformance = {
  name: string;
  roundsPlayed: number;
  confirmedGuesses: number;
  winningGuesses: number;
  totalInvested: number;
  totalPrizesReceived: number;
  bestRankingScore: number;
  successRate: number;
};

export type ClosedRoundWinner = {
  id: string;
  name: string;
  maskedPhone: string;
  guess: string;
  prizeValue: number;
};

export type ClosedRound = {
  id: string;
  match: string;
  result: string;
  dateLabel: string;
  statusLabel: "Teve vencedor" | "Acumulou";
  accumulated: boolean;
  winners: ClosedRoundWinner[];
};

export type GroupStanding = {
  position: number;
  team: string;
  points: number;
  goalDifference: number;
  goalsFor: number;
};

export type DashboardEngagement = {
  roundNumber: number;
  matchId: string;
  bettingClosesAt: string;
  currentPrize: number;
  rankingPosition: number | null;
  needsRankingAnswer: boolean;
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

export type AdminOriginGameMetrics = {
  confirmedPayments: number;
  paidTotal: number;
};

export type AdminOriginAnalyticsRow = {
  originRef: string;
  signups: number;
  confirmedPayments: number;
  paidTotal: number;
  conversionRate: number;
  averageTicket: number;
  byGame: Record<string, AdminOriginGameMetrics>;
};

export type AdminRankingMatch = {
  id: string;
  label: string;
};

export type AdminFinancialRoundRow = {
  id: string;
  match: string;
  status: string;
  confirmedParticipations: number;
  collected: number;
  prizePaid: number;
  expenses: number;
  balance: number;
  winners: number;
};

export type AdminFinancialOverview = {
  totalCollected: number;
  prizesPaid: number;
  expensesTotal: number;
  operationalBalance: number;
  closedRounds: number;
  openRounds: number;
  confirmedParticipations: number;
  averageTicket: number;
  rounds: AdminFinancialRoundRow[];
  expenses: AdminRoundExpense[];
};

export type AdminRoundConversion = {
  visitors: number;
  signups: number;
  confirmedPayments: number;
  signupRate: number;
  conversionRate: number;
};

export type AdminRoundExpense = {
  id: string;
  gameId: string;
  match: string;
  description: string;
  value: number;
  createdAtLabel: string;
};

export type AdminRoundInviteParticipant = {
  id: string;
  name: string;
  phone: string;
  lastMatch: string;
  joinedCurrentRound: boolean;
};

export type AdminRoundInviteTools = {
  currentMatch: {
    id: string;
    homeTeam: string;
    awayTeam: string;
    label: string;
    publicUrl: string;
  } | null;
  participants: AdminRoundInviteParticipant[];
};

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;
const MINIMUM_DISPLAY_PRIZE = 200;
const DEFAULT_CAPACITY = 400;
const DEFAULT_COMPETITION = "Copa do Mundo 2026";
const GAME_COLUMNS = "id,time_da_casa,time_visitante,data_de_correspondencia,apostas_encerram_em";
const PAID_PAYMENT_STATUSES = ["paid", "confirmed", "received", "PAYMENT_RECEIVED"];
const PENDING_PAYMENT_STATUSES = ["pending", "pending_payment", "aguardando_pagamento"];
const CONFIRMED_BET_STATUSES = ["confirmed", "paid", "received", "PAYMENT_RECEIVED", "vencedor"];

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

function optionalNumberValue(row: DbRow, keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value.replace(",", "."));
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
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

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.length <= 4) {
    return "*****";
  }

  const withoutCountry = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  const start = withoutCountry.slice(0, 2);
  const end = withoutCountry.slice(-2);

  return `${start}*****${end}`;
}

function matchFromRow(row: DbRow, confirmedGuesses: number, confirmedRevenue = 0, index = 0): LiveMatch {
  const homeTeam = stringValue(row, ["time_da_casa", "home_team", "mandante", "casa"], "Brasil");
  const awayTeam = stringValue(row, ["time_visitante", "away_team", "visitante", "adversario"], "Adversário");
  const status = stringValue(row, ["status_jogo"], "aberto") as LiveMatch["status"];
  const startsAt = stringValue(
    row,
    ["data_de_correspondencia", "starts_at", "data", "data_jogo"],
    new Date().toISOString()
  );
  const bettingClosesAt = minutesBefore(startsAt, 15);
  const capacity = numberValue(row, ["limite_apostas", "capacidade", "vagas"], DEFAULT_CAPACITY);
  const entryValue = numberValue(row, ["valor_palpite", "entry_value"], ENTRY_VALUE);
  const operationalFee = numberValue(row, ["taxa_operacional", "operational_fee"], OPERATIONAL_FEE);
  const guaranteedPrize = numberValue(row, ["premio_garantido"], MINIMUM_DISPLAY_PRIZE);
  const accumulatedPrize = numberValue(row, ["premio_acumulado"], 0);
  const calculatedPrize = guaranteedPrize + accumulatedPrize + confirmedRevenue * 0.6;
  const storedPrizeTotal = optionalNumberValue(row, ["premio_total_exibido"]);
  const displayedPrizeTotal = status === "encerrado"
    ? storedPrizeTotal ?? Math.max(displayedPrize(confirmedGuesses, entryValue), calculatedPrize)
    : Math.max(storedPrizeTotal ?? 0, displayedPrize(confirmedGuesses, entryValue), calculatedPrize);
  const finalHomeScore = optionalNumberValue(row, ["placar_casa_final"]);
  const finalAwayScore = optionalNumberValue(row, ["placar_visitante_final"]);
  const hasFinalResult = finalHomeScore !== null && finalAwayScore !== null;

  return {
    id: stringValue(row, ["id", "slug"], slugFromTeams(homeTeam, awayTeam)),
    homeTeam,
    awayTeam,
    status: status === "aguardando" || status === "em_andamento" || status === "encerrado" ? status : "aberto",
    correspondenceDate: startsAt,
    startsAt,
    bettingClosesAt,
    dateLabel: dateLabel(startsAt),
    timeLabel: timeLabel(startsAt),
    bettingClosesLabel: shortTimeLabel(bettingClosesAt),
    venue: stringValue(row, ["local", "estadio", "venue"], "Estádio a confirmar"),
    city: stringValue(row, ["cidade", "city"], ""),
    competition: stringValue(row, ["competicao", "competition"], DEFAULT_COMPETITION),
    group: stringValue(row, ["grupo", "group"], index === 0 ? "Próximo jogo" : "Jogo do Brasil"),
    entryValue,
    operationalFee,
    exactPool: displayedPrizeTotal,
    guaranteedPrize,
    accumulatedPrize,
    displayedPrizeTotal,
    finalHomeScore,
    finalAwayScore,
    officialResult: hasFinalResult ? `${finalHomeScore} x ${finalAwayScore}` : "",
    hasFinalResult,
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
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();

  if (!supabase) {
    return 0;
  }

  let query = supabase
    .from("apostas")
    .select("id,pagamento_id,status")
    .in("status", CONFIRMED_BET_STATUSES);

  if (matchId) {
    query = query.eq("jogo_id", matchId);
  }

  const { data: betsData, error } = await query;

  if (error) {
    return 0;
  }

  const bets = (betsData ?? []) as DbRow[];
  const paymentIds = Array.from(new Set(bets.map((bet) => stringValue(bet, ["pagamento_id"])).filter(Boolean)));

  if (paymentIds.length === 0) {
    return 0;
  }

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("pagamentos")
    .select("id")
    .in("id", paymentIds)
    .in("status", PAID_PAYMENT_STATUSES);

  if (paymentsError) {
    return 0;
  }

  const paidPaymentIds = new Set(((paymentsData ?? []) as DbRow[]).map((payment) => stringValue(payment, ["id"])));

  return bets.filter((bet) => paidPaymentIds.has(stringValue(bet, ["pagamento_id"]))).length;
}

async function getConfirmedRevenueForMatch(matchId: string) {
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();

  if (!supabase) {
    return 0;
  }

  const { data: betsData, error: betsError } = await supabase
    .from("apostas")
    .select("pagamento_id")
    .eq("jogo_id", matchId)
    .eq("status", "confirmed");

  if (betsError) {
    return 0;
  }

  const paymentIds = Array.from(new Set(((betsData ?? []) as DbRow[]).map((bet) => stringValue(bet, ["pagamento_id"])).filter(Boolean)));

  if (paymentIds.length === 0) {
    return 0;
  }

  const { data: paymentsData, error: paymentsError } = await supabase
    .from("pagamentos")
    .select("id,valor_total,status")
    .in("id", paymentIds)
    .in("status", PAID_PAYMENT_STATUSES);

  if (paymentsError) {
    return 0;
  }

  return ((paymentsData ?? []) as DbRow[]).reduce(
    (total, payment) => total + numberValue(payment, ["valor_total"], 0),
    0
  );
}

export async function getUpcomingMatches() {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("jogos")
    .select("*")
    .order("data_de_correspondencia", { ascending: true });

  if (error) {
    return [];
  }

  const rows = (data ?? []) as DbRow[];

  return Promise.all(
    rows.map(async (row, index) => {
      const id = stringValue(row, ["id", "slug"]);
      const [confirmedGuesses, confirmedRevenue] = await Promise.all([
        getConfirmedGuessesCount(id),
        getConfirmedRevenueForMatch(id)
      ]);
      return matchFromRow(row, confirmedGuesses, confirmedRevenue, index);
    })
  );
}

export async function getNextMatch() {
  const matches = await getUpcomingMatches();
  return matches.find((match) => match.status === "aberto")
    ?? matches.find((match) => match.status !== "encerrado")
    ?? matches[0]
    ?? null;
}

export async function getMatchById(id: string) {
  const matches = await getUpcomingMatches();
  return matches.find((match) => match.id === id || slugFromTeams(match.homeTeam, match.awayTeam) === id) ?? null;
}

export async function getGroupStandings(group = "Grupo C"): Promise<GroupStanding[]> {
  const matches = (await getUpcomingMatches()).filter((match) => match.group.toLowerCase() === group.toLowerCase());
  const table = new Map<string, Omit<GroupStanding, "position">>();

  for (const match of matches) {
    for (const team of [match.homeTeam, match.awayTeam]) {
      if (!table.has(team)) {
        table.set(team, { team, points: 0, goalDifference: 0, goalsFor: 0 });
      }
    }

    if (!match.hasFinalResult || match.finalHomeScore === null || match.finalAwayScore === null) {
      continue;
    }

    const home = table.get(match.homeTeam)!;
    const away = table.get(match.awayTeam)!;
    home.goalsFor += match.finalHomeScore;
    away.goalsFor += match.finalAwayScore;
    home.goalDifference += match.finalHomeScore - match.finalAwayScore;
    away.goalDifference += match.finalAwayScore - match.finalHomeScore;

    if (match.finalHomeScore === match.finalAwayScore) {
      home.points += 1;
      away.points += 1;
    } else if (match.finalHomeScore > match.finalAwayScore) {
      home.points += 3;
    } else {
      away.points += 3;
    }
  }

  return Array.from(table.values())
    .sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.team.localeCompare(b.team))
    .map((row, index) => ({ ...row, position: index + 1 }));
}

export async function getDashboardEngagement(): Promise<DashboardEngagement | null> {
  const user = getCurrentUser();
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();
  const matches = await getUpcomingMatches();
  const openMatch = matches.find((match) => match.status === "aberto");

  if (!user || !supabase || !openMatch) {
    return null;
  }

  const roundNumber = Math.max(matches.findIndex((match) => match.id === openMatch.id) + 1, 1);
  const currentPrize = Math.max(MINIMUM_DISPLAY_PRIZE, openMatch.confirmedGuesses * ENTRY_VALUE * 0.6);
  const [{ data: betsData }, rankingPlayers] = await Promise.all([
    supabase
      .from("apostas")
      .select("pagamento_id")
      .eq("perfil_id", user.id)
      .eq("jogo_id", openMatch.id)
      .eq("status", "confirmed"),
    getRankingPlayers(1000)
  ]);
  const paymentIds = Array.from(new Set(((betsData ?? []) as DbRow[]).map((bet) => stringValue(bet, ["pagamento_id"])).filter(Boolean)));
  let hasConfirmedParticipation = false;

  if (paymentIds.length > 0) {
    const { count } = await supabase
      .from("pagamentos")
      .select("id", { count: "exact", head: true })
      .in("id", paymentIds)
      .in("status", PAID_PAYMENT_STATUSES);
    hasConfirmedParticipation = (count ?? 0) > 0;
  }

  const { data: vote } = hasConfirmedParticipation
    ? await supabase
      .from("torcida_votos")
      .select("id")
      .eq("perfil_id", user.id)
      .eq("jogo_id", openMatch.id)
      .maybeSingle()
    : { data: null };
  const rankingIndex = rankingPlayers.findIndex((player) => player.profileId === user.id);

  return {
    roundNumber,
    matchId: openMatch.id,
    bettingClosesAt: openMatch.bettingClosesAt,
    currentPrize,
    rankingPosition: rankingIndex >= 0 ? rankingIndex + 1 : null,
    needsRankingAnswer: hasConfirmedParticipation && !vote
  };
}

export async function getRankingPlayers(limit = 10): Promise<LiveRankingPlayer[]> {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("torcida_votos")
    .select("*, perfis(*)")
    .order("pontos", { ascending: false });

  if (error) {
    return [];
  }

  const playersByProfile = new Map<string, LiveRankingPlayer>();

  for (const row of (data ?? []) as DbRow[]) {
    const profile = (row.perfis ?? {}) as DbRow;
    const profileId = stringValue(row, ["perfil_id"], stringValue(profile, ["id"], stringValue(row, ["id"])));
    const current = playersByProfile.get(profileId) ?? {
      position: 0,
      profileId,
      name: stringValue(profile, ["nome", "name"], stringValue(row, ["nome", "name"], "Participante")),
      points: 0,
      games: 0
    };

    current.points += numberValue(row, ["pontos_total_rodada", "pontos", "points", "pontuacao"], 0);
    current.games += numberValue(row, ["jogos", "games", "participacoes"], 1);
    playersByProfile.set(profileId, current);
  }

  return Array.from(playersByProfile.values())
    .sort((a, b) => b.points - a.points || b.games - a.games)
    .slice(0, limit)
    .map((player, index) => ({ ...player, position: index + 1 }));
}

export async function getRankingRoundDetails(limit = 50): Promise<LiveRankingRoundDetail[]> {
  const supabase = getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("torcida_votos")
    .select("*, perfis(*), jogos(*)")
    .not("apurado_em", "is", null)
    .order("apurado_em", { ascending: false })
    .limit(limit);

  if (error) {
    return [];
  }

  return ((data ?? []) as DbRow[]).map((vote) => {
    const profile = (vote.perfis ?? {}) as DbRow;
    const game = (vote.jogos ?? {}) as DbRow;
    const homeTeam = stringValue(game, ["time_da_casa"], "Brasil");
    const awayTeam = stringValue(game, ["time_visitante"], "Adversário");

    return {
      id: stringValue(vote, ["id"]),
      name: stringValue(profile, ["nome"], "Participante"),
      match: `${homeTeam} x ${awayTeam}`,
      dateLabel: dateLabel(stringValue(game, ["data_de_correspondencia"], "")),
      total: numberValue(vote, ["pontos_total_rodada", "pontos"], 0),
      accumulated: numberValue(vote, ["pontos_total_acumulado"], 0),
      resultado: numberValue(vote, ["pontos_resultado"], 0),
      gols: numberValue(vote, ["pontos_gols"], 0),
      primeiroGol: numberValue(vote, ["pontos_primeiro_gol"], 0),
      escanteios: numberValue(vote, ["pontos_escanteios"], 0),
      cartoes: numberValue(vote, ["pontos_cartoes"], 0)
    };
  });
}

export async function getClosedRounds(): Promise<ClosedRound[]> {
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();

  if (!supabase) {
    return [];
  }

  const { data: gamesData, error: gamesError } = await supabase
    .from("jogos")
    .select("*")
    .eq("status_jogo", "encerrado")
    .order("data_de_correspondencia", { ascending: false });

  if (gamesError) {
    return [];
  }

  const games = (gamesData ?? []) as DbRow[];
  const gameIds = games.map((game) => stringValue(game, ["id"])).filter(Boolean);
  const { data: winnersData } = gameIds.length
    ? await supabase
      .from("rodada_vencedores")
      .select("id,jogo_id,nome,telefone_mascarado,palpite_casa,palpite_visitante,valor_premio")
      .in("jogo_id", gameIds)
      .order("criado_em", { ascending: false })
    : { data: [] };
  const winnersByGame = new Map<string, ClosedRoundWinner[]>();

  for (const winner of (winnersData ?? []) as DbRow[]) {
    const gameId = stringValue(winner, ["jogo_id"]);
    const currentWinners = winnersByGame.get(gameId) ?? [];
    currentWinners.push({
      id: stringValue(winner, ["id"]),
      name: stringValue(winner, ["nome"], "Vencedor"),
      maskedPhone: stringValue(winner, ["telefone_mascarado"], "*****"),
      guess: `${numberValue(winner, ["palpite_casa"], 0)} x ${numberValue(winner, ["palpite_visitante"], 0)}`,
      prizeValue: numberValue(winner, ["valor_premio"], 0)
    });
    winnersByGame.set(gameId, currentWinners);
  }

  return games.map((game) => {
    const id = stringValue(game, ["id"]);
    const homeTeam = stringValue(game, ["time_da_casa"], "Brasil");
    const awayTeam = stringValue(game, ["time_visitante"], "Adversário");
    const finalHome = optionalNumberValue(game, ["placar_casa_final"]);
    const finalAway = optionalNumberValue(game, ["placar_visitante_final"]);
    const winners = winnersByGame.get(id) ?? [];

    return {
      id,
      match: `${homeTeam} x ${awayTeam}`,
      result: finalHome !== null && finalAway !== null ? `${homeTeam} ${finalHome} x ${finalAway} ${awayTeam}` : "Resultado não informado",
      dateLabel: dateLabel(stringValue(game, ["data_de_correspondencia"], "")),
      statusLabel: winners.length > 0 ? "Teve vencedor" : "Acumulou",
      accumulated: winners.length === 0,
      winners
    };
  });
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
      topAffiliates: [] as AdminAffiliateRow[],
      originAnalytics: [] as AdminOriginAnalyticsRow[],
      rankingMatches: [] as AdminRankingMatch[],
      roundConversion: {
        visitors: 0,
        signups: 0,
        confirmedPayments: 0,
        signupRate: 0,
        conversionRate: 0
      } as AdminRoundConversion,
      inviteTools: {
        currentMatch: null,
        participants: []
      } as AdminRoundInviteTools,
      financial: {
        totalCollected: 0,
        prizesPaid: 0,
        expensesTotal: 0,
        operationalBalance: 0,
        closedRounds: 0,
        openRounds: 0,
        confirmedParticipations: 0,
        averageTicket: 0,
        rounds: [],
        expenses: []
      } as AdminFinancialOverview
    };
  }

  const [
    { count: users },
    { count: paymentsPending },
    { data: paidPayments },
    { data: referralProfiles },
    { data: allGamesData },
    { data: allConfirmedBetsData },
    { data: allWinnersData },
    expensesResult
  ] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }),
    supabase.from("pagamentos").select("id", { count: "exact", head: true }).in("status", PENDING_PAYMENT_STATUSES),
    supabase.from("pagamentos").select("id,valor_total,origem_ref").in("status", PAID_PAYMENT_STATUSES),
    supabase.from("perfis").select("origem_ref"),
    supabase.from("jogos").select("id,time_da_casa,time_visitante,status_jogo,data_de_correspondencia"),
    supabase.from("apostas").select("id,jogo_id,pagamento_id,perfil_id,status").eq("status", "confirmed"),
    supabase.from("rodada_vencedores").select("id,jogo_id,valor_premio"),
    supabase.from("rodada_despesas").select("id,jogo_id,descricao,valor,criado_em").order("criado_em", { ascending: false })
  ]);

  const usersCount = users ?? 0;
  const confirmedPaymentsRows = (paidPayments ?? []) as DbRow[];
  const paymentsConfirmed = confirmedPaymentsRows.length;
  const paidTotal = ((paidPayments ?? []) as DbRow[]).reduce(
    (total, payment) => total + numberValue(payment, ["valor_total"], 0),
    0
  );
  const affiliateStats = new Map<string, AdminAffiliateRow>();
  const originStats = new Map<string, AdminOriginAnalyticsRow>();

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

    const currentOrigin = originStats.get(originRef) ?? {
      originRef,
      signups: 0,
      confirmedPayments: 0,
      paidTotal: 0,
      conversionRate: 0,
      averageTicket: 0,
      byGame: {}
    };

    currentOrigin.signups += 1;
    originStats.set(originRef, currentOrigin);
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

    const currentOrigin = originStats.get(originRef) ?? {
      originRef,
      signups: 0,
      confirmedPayments: 0,
      paidTotal: 0,
      conversionRate: 0,
      averageTicket: 0,
      byGame: {}
    };

    currentOrigin.confirmedPayments += 1;
    currentOrigin.paidTotal += numberValue(payment, ["valor_total"], 0);
    originStats.set(originRef, currentOrigin);
  }

  const topAffiliates = Array.from(affiliateStats.values())
    .sort((a, b) => b.paidTotal - a.paidTotal || b.confirmedPayments - a.confirmedPayments || b.signups - a.signups)
    .slice(0, 10);
  const paidPaymentsById = new Map(confirmedPaymentsRows.map((payment) => [stringValue(payment, ["id"]), payment]));
  const allConfirmedBets = (allConfirmedBetsData ?? []) as DbRow[];
  const paymentGameIds = new Map<string, Set<string>>();

  for (const bet of allConfirmedBets) {
    const paymentId = stringValue(bet, ["pagamento_id"]);
    const gameId = stringValue(bet, ["jogo_id"]);

    if (!paymentId || !gameId) {
      continue;
    }

    const current = paymentGameIds.get(paymentId) ?? new Set<string>();
    current.add(gameId);
    paymentGameIds.set(paymentId, current);
  }

  for (const payment of confirmedPaymentsRows) {
    const originRef = stringValue(payment, ["origem_ref"]);

    if (!originRef) {
      continue;
    }

    const currentOrigin = originStats.get(originRef);

    if (!currentOrigin) {
      continue;
    }

    const paymentId = stringValue(payment, ["id"]);
    const gameIds = paymentGameIds.get(paymentId) ?? new Set<string>();

    for (const gameId of Array.from(gameIds)) {
      const currentGame = currentOrigin.byGame[gameId] ?? {
        confirmedPayments: 0,
        paidTotal: 0
      };

      currentGame.confirmedPayments += 1;
      currentGame.paidTotal += numberValue(payment, ["valor_total"], 0);
      currentOrigin.byGame[gameId] = currentGame;
    }
  }

  const originAnalytics = Array.from(originStats.values())
    .map((origin) => ({
      ...origin,
      conversionRate: origin.signups > 0 ? Math.round((origin.confirmedPayments / origin.signups) * 100) : 0,
      averageTicket: origin.confirmedPayments > 0 ? origin.paidTotal / origin.confirmedPayments : 0
    }))
    .sort((a, b) => b.paidTotal - a.paidTotal || b.confirmedPayments - a.confirmedPayments || b.signups - a.signups);
  const allWinners = (allWinnersData ?? []) as DbRow[];
  const allExpenses = expensesResult.error ? [] : (expensesResult.data ?? []) as DbRow[];
  const prizePaidTotal = allWinners.reduce((total, winner) => total + numberValue(winner, ["valor_premio"], 0), 0);
  const expensesTotal = allExpenses.reduce((total, expense) => total + numberValue(expense, ["valor"], 0), 0);
  const gamesRows = (allGamesData ?? []) as DbRow[];
  const gameLabelById = new Map(
    gamesRows.map((game) => [
      stringValue(game, ["id"]),
      `${stringValue(game, ["time_da_casa"], "Brasil")} x ${stringValue(game, ["time_visitante"], "Adversário")}`
    ])
  );
  const expenses = allExpenses.map((expense): AdminRoundExpense => {
    const gameId = stringValue(expense, ["jogo_id"]);

    return {
      id: stringValue(expense, ["id"]),
      gameId,
      match: gameLabelById.get(gameId) ?? "Rodada não encontrada",
      description: stringValue(expense, ["descricao"], "Despesa"),
      value: numberValue(expense, ["valor"], 0),
      createdAtLabel: dateTimeLabel(stringValue(expense, ["criado_em"], ""))
    };
  });
  const financialRounds = gamesRows
    .map((game): AdminFinancialRoundRow => {
      const gameId = stringValue(game, ["id"]);
      const gameBets = allConfirmedBets.filter((bet) => stringValue(bet, ["jogo_id"]) === gameId);
      const paymentIds = Array.from(new Set(gameBets.map((bet) => stringValue(bet, ["pagamento_id"])).filter(Boolean)));
      const collected = paymentIds.reduce((total, paymentId) => {
        const payment = paidPaymentsById.get(paymentId);
        return total + (payment ? numberValue(payment, ["valor_total"], 0) : 0);
      }, 0);
      const gameWinners = allWinners.filter((winner) => stringValue(winner, ["jogo_id"]) === gameId);
      const prizePaid = gameWinners.reduce((total, winner) => total + numberValue(winner, ["valor_premio"], 0), 0);
      const gameExpenses = allExpenses
        .filter((expense) => stringValue(expense, ["jogo_id"]) === gameId)
        .reduce((total, expense) => total + numberValue(expense, ["valor"], 0), 0);

      return {
        id: gameId,
        match: gameLabelById.get(gameId) ?? "Rodada",
        status: stringValue(game, ["status_jogo"], "aberto"),
        confirmedParticipations: gameBets.length,
        collected,
        prizePaid,
        expenses: gameExpenses,
        balance: collected - prizePaid - gameExpenses,
        winners: gameWinners.length
      };
    })
    .sort((a, b) => {
      const gameA = gamesRows.find((game) => stringValue(game, ["id"]) === a.id) ?? {};
      const gameB = gamesRows.find((game) => stringValue(game, ["id"]) === b.id) ?? {};
      return new Date(stringValue(gameB, ["data_de_correspondencia"], "")).getTime() - new Date(stringValue(gameA, ["data_de_correspondencia"], "")).getTime();
    });
  const financial: AdminFinancialOverview = {
    totalCollected: paidTotal,
    prizesPaid: prizePaidTotal,
    expensesTotal,
    operationalBalance: paidTotal - prizePaidTotal - expensesTotal,
    closedRounds: gamesRows.filter((game) => stringValue(game, ["status_jogo"]) === "encerrado").length,
    openRounds: gamesRows.filter((game) => stringValue(game, ["status_jogo"], "aberto") === "aberto").length,
    confirmedParticipations: allConfirmedBets.length,
    averageTicket: paymentsConfirmed > 0 ? paidTotal / paymentsConfirmed : 0,
    rounds: financialRounds,
    expenses
  };
  const rankingMatches = matches
    .filter((match) => match.hasFinalResult)
    .map((match): AdminRankingMatch => ({
      id: match.id,
      label: `${match.homeTeam} x ${match.awayTeam} - ${match.officialResult || match.dateLabel}`
    }));
  const currentInviteMatch = matches.find((match) => match.status === "aberto") ?? null;
  const currentInviteMatchId = currentInviteMatch?.id ?? "";
  const previousBets = currentInviteMatchId
    ? allConfirmedBets.filter((bet) => stringValue(bet, ["jogo_id"]) !== currentInviteMatchId)
    : allConfirmedBets;
  const inviteProfileIds = Array.from(new Set(previousBets.map((bet) => stringValue(bet, ["perfil_id"])).filter(Boolean)));
  const [{ data: inviteProfilesData }, { data: inviteGamesData }] = await Promise.all([
    inviteProfileIds.length
      ? supabase.from("perfis").select("id,nome,telefone").in("id", inviteProfileIds)
      : Promise.resolve({ data: [] }),
    previousBets.length
      ? supabase.from("jogos").select("id,time_da_casa,time_visitante,data_de_correspondencia").in(
        "id",
        Array.from(new Set(previousBets.map((bet) => stringValue(bet, ["jogo_id"])).filter(Boolean)))
      )
      : Promise.resolve({ data: [] })
  ]);
  const inviteProfilesById = new Map(((inviteProfilesData ?? []) as DbRow[]).map((profile) => [stringValue(profile, ["id"]), profile]));
  const inviteGamesById = new Map(((inviteGamesData ?? []) as DbRow[]).map((game) => [stringValue(game, ["id"]), game]));
  const currentRoundProfileIds = new Set(
    allConfirmedBets
      .filter((bet) => stringValue(bet, ["jogo_id"]) === currentInviteMatchId)
      .map((bet) => stringValue(bet, ["perfil_id"]))
      .filter(Boolean)
  );
  const latestBetByProfile = new Map<string, DbRow>();

  for (const bet of previousBets) {
    const profileId = stringValue(bet, ["perfil_id"]);
    const current = latestBetByProfile.get(profileId);
    const currentGame = current ? inviteGamesById.get(stringValue(current, ["jogo_id"])) ?? {} : {};
    const nextGame = inviteGamesById.get(stringValue(bet, ["jogo_id"])) ?? {};
    const currentDate = new Date(stringValue(currentGame, ["data_de_correspondencia"], "")).getTime();
    const nextDate = new Date(stringValue(nextGame, ["data_de_correspondencia"], "")).getTime();

    if (!current || nextDate >= currentDate) {
      latestBetByProfile.set(profileId, bet);
    }
  }

  const inviteTools: AdminRoundInviteTools = {
    currentMatch: currentInviteMatch
      ? {
        id: currentInviteMatch.id,
        homeTeam: currentInviteMatch.homeTeam,
        awayTeam: currentInviteMatch.awayTeam,
        label: `${currentInviteMatch.homeTeam} x ${currentInviteMatch.awayTeam}`,
        publicUrl: `https://bolao-copa-brasil.vercel.app/jogos/${currentInviteMatch.id}`
      }
      : null,
    participants: Array.from(latestBetByProfile.entries())
      .map(([profileId, bet]) => {
        const profile = inviteProfilesById.get(profileId) ?? {};
        const lastGame = inviteGamesById.get(stringValue(bet, ["jogo_id"])) ?? {};

        return {
          id: profileId,
          name: stringValue(profile, ["nome"], "Participante"),
          phone: stringValue(profile, ["telefone"], ""),
          lastMatch: `${stringValue(lastGame, ["time_da_casa"], "Brasil")} x ${stringValue(lastGame, ["time_visitante"], "Adversário")}`,
          joinedCurrentRound: currentRoundProfileIds.has(profileId)
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  };

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

  const activeMatch = matches.find((match) => match.status === "aberto") ?? null;
  let roundConversion: AdminRoundConversion = {
    visitors: 0,
    signups: 0,
    confirmedPayments: 0,
    signupRate: 0,
    conversionRate: 0
  };

  if (activeMatch) {
    const { data: activeGameData } = await supabase
      .from("jogos")
      .select("aberto_em")
      .eq("id", activeMatch.id)
      .maybeSingle();
    const fallbackOpenedAt = matches
      .filter((match) => match.status === "encerrado" && new Date(match.startsAt).getTime() < new Date(activeMatch.startsAt).getTime())
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())[0]?.startsAt;
    const openedAt = stringValue((activeGameData ?? {}) as DbRow, ["aberto_em"], fallbackOpenedAt ?? "");
    const currentRoundPaymentIds = new Set(
      allConfirmedBets
        .filter((bet) => stringValue(bet, ["jogo_id"]) === activeMatch.id)
        .map((bet) => stringValue(bet, ["pagamento_id"]))
        .filter((paymentId) => paidPaymentsById.has(paymentId))
    );
    const [visitorsResult, signupsResult] = await Promise.all([
      supabase
        .from("rodada_visitantes")
        .select("id", { count: "exact", head: true })
        .eq("jogo_id", activeMatch.id),
      openedAt
        ? supabase.from("perfis").select("id", { count: "exact", head: true }).gte("criado_em", openedAt)
        : Promise.resolve({ count: 0 })
    ]);
    const visitors = visitorsResult.error ? 0 : visitorsResult.count ?? 0;
    const signups = signupsResult.count ?? 0;
    const confirmedPayments = currentRoundPaymentIds.size;

    roundConversion = {
      visitors,
      signups,
      confirmedPayments,
      signupRate: visitors > 0 ? Number(((signups / visitors) * 100).toFixed(1)) : 0,
      conversionRate: signups > 0 ? Number(((confirmedPayments / signups) * 100).toFixed(1)) : 0
    };
  }

  return {
    matches,
    prize,
    users: usersCount,
    paymentsConfirmed,
    paymentsPending: paymentsPending ?? 0,
    conversionRate: usersCount > 0 ? Math.round((paymentsConfirmed / usersCount) * 100) : 0,
    paidTotal,
    bets,
    topAffiliates,
    originAnalytics,
    rankingMatches,
    roundConversion,
    inviteTools,
    financial
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

  const [{ data: profile }, { data: guesses }, { data: rankingVotes }] = await Promise.all([
    supabase.from("perfis").select("id,nome,telefone").eq("id", user.id).maybeSingle(),
    supabase.from("apostas").select("*, jogos(*)").eq("perfil_id", user.id).limit(10),
    supabase
      .from("torcida_votos")
      .select("*, jogos(*)")
      .eq("perfil_id", user.id)
      .order("criado_em", { ascending: false })
  ]);

  const profileRow = (profile ?? {}) as DbRow;
  const rankingByGame = new Map<string, LiveRankingBreakdown>();

  for (const vote of (rankingVotes ?? []) as DbRow[]) {
    const game = (vote.jogos ?? {}) as DbRow;
    const gameId = stringValue(vote, ["jogo_id"]);
    const homeTeam = stringValue(game, ["time_da_casa"], "Brasil");
    const awayTeam = stringValue(game, ["time_visitante"], "Adversário");

    rankingByGame.set(gameId, {
      match: `${homeTeam} x ${awayTeam}`,
      dateLabel: dateLabel(stringValue(game, ["data_de_correspondencia"], "")),
      total: numberValue(vote, ["pontos_total_rodada", "pontos"], 0),
      accumulated: numberValue(vote, ["pontos_total_acumulado"], 0),
      resultado: numberValue(vote, ["pontos_resultado"], 0),
      gols: numberValue(vote, ["pontos_gols"], 0),
      primeiroGol: numberValue(vote, ["pontos_primeiro_gol"], 0),
      escanteios: numberValue(vote, ["pontos_escanteios"], 0),
      cartoes: numberValue(vote, ["pontos_cartoes"], 0)
    });
  }

  const history = ((guesses ?? []) as DbRow[]).map((guess) => {
    const game = (guess.jogos ?? {}) as DbRow;
    const gameId = stringValue(guess, ["jogo_id"]);
    const homeTeam = stringValue(game, ["time_da_casa"], "Brasil");
    const awayTeam = stringValue(game, ["time_visitante"], "Adversário");
    const homeScore = numberValue(guess, ["gols_brasil", "gols_casa", "brasil_goals", "placar_casa"], 0);
    const awayScore = numberValue(guess, ["gols_adversario", "gols_visitante", "opponent_goals", "placar_visitante"], 0);
    const finalHome = optionalNumberValue(game, ["placar_casa_final"]);
    const finalAway = optionalNumberValue(game, ["placar_visitante_final"]);
    const gameStatus = stringValue(game, ["status_jogo"], "aberto");
    const resultStatus = stringValue(guess, ["resultado_status"], "aguardando");

    return {
      match: `${homeTeam} x ${awayTeam}`,
      dateLabel: dateLabel(stringValue(game, ["data_de_correspondencia"], "")),
      guess: `${homeScore} x ${awayScore}`,
      officialResult: finalHome !== null && finalAway !== null ? `${finalHome} x ${finalAway}` : "",
      points: numberValue(guess, ["pontos", "points"], 0),
      status: gameStatus === "encerrado"
        ? resultStatus === "vencedor"
          ? "vencedor"
          : "perdedor"
        : "aguardando",
      rankingBreakdown: rankingByGame.get(gameId)
    };
  });

  return {
    name: stringValue(profileRow, ["nome", "name"], "Participante"),
    phone: stringValue(profileRow, ["telefone", "phone", "whatsapp_phone"], ""),
    history
  };
}

export async function getParticipantPerformance(): Promise<LiveParticipantPerformance | null> {
  const supabase = getSupabaseServerClient() ?? getSupabaseServer();
  const user = getCurrentUser();

  if (!supabase || !user) {
    return null;
  }

  const [{ data: profile }, { data: guesses }, { data: payments }, { data: prizes }, { data: rankingVotes }] = await Promise.all([
    supabase.from("perfis").select("id,nome").eq("id", user.id).maybeSingle(),
    supabase
      .from("apostas")
      .select("id,jogo_id,status,resultado_status")
      .eq("perfil_id", user.id),
    supabase
      .from("pagamentos")
      .select("id,valor_total,status")
      .eq("perfil_id", user.id)
      .in("status", PAID_PAYMENT_STATUSES),
    supabase
      .from("rodada_vencedores")
      .select("valor_premio")
      .eq("perfil_id", user.id),
    supabase
      .from("torcida_votos")
      .select("pontos_total_rodada,pontos")
      .eq("perfil_id", user.id)
  ]);

  const guessRows = (guesses ?? []) as DbRow[];
  const confirmedGuesses = guessRows.filter((guess) => stringValue(guess, ["status"]) === "confirmed");
  const winningGuesses = guessRows.filter((guess) => stringValue(guess, ["resultado_status"]) === "vencedor");
  const roundsPlayed = new Set(confirmedGuesses.map((guess) => stringValue(guess, ["jogo_id"])).filter(Boolean)).size;
  const totalInvested = ((payments ?? []) as DbRow[]).reduce(
    (total, payment) => total + numberValue(payment, ["valor_total"], 0),
    0
  );
  const totalPrizesReceived = ((prizes ?? []) as DbRow[]).reduce(
    (total, prize) => total + numberValue(prize, ["valor_premio"], 0),
    0
  );
  const bestRankingScore = ((rankingVotes ?? []) as DbRow[]).reduce(
    (best, vote) => Math.max(best, numberValue(vote, ["pontos_total_rodada", "pontos"], 0)),
    0
  );

  return {
    name: stringValue((profile ?? {}) as DbRow, ["nome"], user.nome),
    roundsPlayed,
    confirmedGuesses: confirmedGuesses.length,
    winningGuesses: winningGuesses.length,
    totalInvested,
    totalPrizesReceived,
    bestRankingScore,
    successRate: confirmedGuesses.length > 0 ? Math.round((winningGuesses.length / confirmedGuesses.length) * 100) : 0
  };
}

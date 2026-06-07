export const nextBrazilMatch = {
  id: "brasil-marrocos",
  homeTeam: "Brasil",
  awayTeam: "Marrocos",
  dateLabel: "13/06/2026",
  timeLabel: "19h (Brasília)",
  venue: "MetLife Stadium",
  competition: "Copa do Mundo 2026",
  group: "Grupo C",
  startsAt: "2026-06-13T19:00:00-03:00",
  bettingClosesAt: "2026-06-13T18:00:00-03:00",
  bettingClosesLabel: "18h",
  confirmedGuesses: 347,
  spotsLeft: 53,
  maxEntries: 400,
  entryValue: 10,
  operationalFee: 1.99,
  exactPool: 18420,
  rankingPool: 6370,
  scoreExamples: [
    { brazil: 1, opponent: 0 },
    { brazil: 2, opponent: 0 },
    { brazil: 2, opponent: 1 },
    { brazil: 3, opponent: 1 },
    { brazil: 4, opponent: 2 },
    { brazil: 5, opponent: 1 },
    { brazil: 7, opponent: 0 },
    { brazil: 10, opponent: 3 },
    { brazil: 1, opponent: 1 }
  ],
  nextMatchAfterFinish: {
    source: "supabase.matches",
    rule: "select the next Brazil match where starts_at is greater than the finished match end time"
  }
};

export const upcomingBrazilMatches = [
  {
    homeTeam: "Brasil",
    awayTeam: "Haiti",
    dateLabel: "19/06/2026",
    timeLabel: "21h30",
    venue: "Lincoln Financial Field",
    group: "Grupo C"
  },
  {
    homeTeam: "Brasil",
    awayTeam: "Escócia",
    dateLabel: "24/06/2026",
    timeLabel: "19h",
    venue: "Hard Rock Stadium",
    group: "Grupo C"
  }
];

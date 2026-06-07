export const platformStats = {
  exactPool: 18420,
  rankingPool: 6370,
  nextEntryValue: 10,
  pixKey: process.env.NEXT_PUBLIC_PIX_KEY || "bolao@copabrasil.com"
};

export const matches = [
  {
    id: "brasil-marrocos",
    brazil: "Brasil",
    opponent: "Marrocos",
    date: "13 junho 2026",
    time: "19:00",
    venue: "MetLife Stadium",
    entry: 10,
    exactPrize: 18420,
    carryover: 6370
  },
  {
    id: "brasil-haiti",
    brazil: "Brasil",
    opponent: "Haiti",
    date: "19 junho 2026",
    time: "21:30",
    venue: "Lincoln Financial Field",
    entry: 10,
    exactPrize: 0,
    carryover: 0
  },
  {
    id: "brasil-escocia",
    brazil: "Brasil",
    opponent: "Escocia",
    date: "24 junho 2026",
    time: "19:00",
    venue: "Hard Rock Stadium",
    entry: 10,
    exactPrize: 0,
    carryover: 0
  }
];

export const ranking = [
  { position: 1, name: "Ana Paula", points: 64, games: 3 },
  { position: 2, name: "Marcos Silva", points: 58, games: 3 },
  { position: 3, name: "Joao Pedro", points: 54, games: 3 },
  { position: 4, name: "Camila Rocha", points: 49, games: 2 },
  { position: 5, name: "Felipe Costa", points: 45, games: 2 },
  { position: 6, name: "Bruna Lima", points: 41, games: 2 },
  { position: 7, name: "Rafael Souza", points: 39, games: 2 },
  { position: 8, name: "Diego Alves", points: 34, games: 2 },
  { position: 9, name: "Larissa Gomes", points: 31, games: 1 },
  { position: 10, name: "Thiago Nunes", points: 28, games: 1 }
];

export const userHistory = [
  { match: "Brasil 2 x 0 Senegal", guess: "2 x 0", points: 25, status: "Palpite perfeito" },
  { match: "Brasil 1 x 1 Espanha", guess: "2 x 1", points: 13, status: "Pontuou no ranking" },
  { match: "Brasil 3 x 1 Japao", guess: "1 x 0", points: 10, status: "Acertou vencedor" }
];

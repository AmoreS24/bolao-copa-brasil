import { Medal } from "lucide-react";
import { ranking } from "@/data/mock";

export function RankingList({ limit = ranking.length }: { limit?: number }) {
  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-field">
      {ranking.slice(0, limit).map((player) => (
        <div key={player.position} className="flex items-center gap-3 border-b border-slate-100 p-4 last:border-0">
          <span
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-black ${
              player.position <= 3 ? "bg-brasil-yellow text-brasil-navy" : "bg-brasil-light text-brasil-green"
            }`}
          >
            {player.position <= 3 ? <Medal size={19} aria-hidden /> : player.position}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-black text-brasil-navy">{player.name}</p>
            <p className="text-sm font-semibold text-slate-500">{player.games} jogos participados</p>
          </div>
          <p className="text-right text-lg font-black text-brasil-blue">{player.points} pts</p>
        </div>
      ))}
    </div>
  );
}

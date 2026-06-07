import { CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { currency } from "@/lib/utils";

type Match = {
  id: string;
  brazil: string;
  opponent: string;
  date: string;
  time: string;
  venue: string;
  entry: number;
  exactPrize: number;
  carryover: number;
};

export function MatchCard({ match }: { match: Match }) {
  const isActive = match.exactPrize > 0;

  return (
    <article className="rounded-lg bg-white p-4 shadow-field">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase text-brasil-green">Proximo jogo</p>
          <h3 className="text-xl font-black text-brasil-navy">
            {match.brazil} x {match.opponent}
          </h3>
        </div>
        <span className="grid h-12 w-12 place-items-center rounded-full bg-brasil-yellow text-brasil-blue">
          <ShieldCheck aria-hidden />
        </span>
      </div>
      <div className="grid gap-2 text-sm font-semibold text-slate-600">
        <p className="flex items-center gap-2">
          <CalendarDays size={17} aria-hidden /> {match.date}, {match.time}
        </p>
        <p className="flex items-center gap-2">
          <MapPin size={17} aria-hidden /> {match.venue}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-brasil-light p-3">
        <div>
          <p className="text-xs font-bold text-slate-500">Participacao</p>
          <p className="font-black text-brasil-navy">{currency(match.entry)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-500">Premio exato</p>
          <p className="font-black text-brasil-green">{currency(match.exactPrize + match.carryover)}</p>
        </div>
      </div>
      <Link
        href={isActive ? `/jogos/${match.id}` : "#"}
        aria-disabled={!isActive}
        className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full px-4 font-black ${
          isActive ? "bg-brasil-green text-white" : "pointer-events-none bg-slate-200 text-slate-500"
        }`}
      >
        {isActive ? "Participar" : "Em breve"}
      </Link>
    </article>
  );
}

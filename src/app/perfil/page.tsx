import { Phone, Trophy, UserRound } from "lucide-react";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { getPrizeValue, getProfileSummary } from "@/data/supabase-live";
import { currency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, prize] = await Promise.all([getProfileSummary(), getPrizeValue()]);

  return (
    <PageShell>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={UserRound} label="Nome" value={profile.name} />
        <StatCard icon={Phone} label="Telefone" value={profile.phone || "-"} tone="blue" />
        <StatCard icon={Trophy} label="Possiveis premios" value={currency(prize)} tone="yellow" />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Perfil" title="Historico de participacoes e palpites" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {profile.history.map((item) => (
            <div key={item.match} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-4">
              <p className="font-black text-brasil-navy">{item.match}</p>
              <p className="font-semibold text-slate-600">{item.guess}</p>
              <p className="font-semibold text-slate-600">{item.points} pontos</p>
              <p className="font-black text-brasil-green">{item.status}</p>
            </div>
          ))}
          {profile.history.length === 0 ? (
            <div className="p-4 font-semibold text-slate-600">Nenhuma participação encontrada no Supabase.</div>
          ) : null}
        </div>
      </section>
    </PageShell>
  );
}

import { Phone, Trophy, UserRound } from "lucide-react";
import { PageShell, SectionTitle, StatCard } from "@/components/ui";
import { userHistory } from "@/data/mock";

export default function ProfilePage() {
  return (
    <PageShell>
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard icon={UserRound} label="Nome" value="Erick Oliveira" />
        <StatCard icon={Phone} label="Telefone" value="(93) 99999-0000" tone="blue" />
        <StatCard icon={Trophy} label="Possiveis premios" value="R$ 0,00" tone="yellow" />
      </section>
      <section className="mt-10">
        <SectionTitle eyebrow="Perfil" title="Historico de participacoes e palpites" />
        <div className="overflow-hidden rounded-lg bg-white shadow-field">
          {userHistory.map((item) => (
            <div key={item.match} className="grid gap-2 border-b border-slate-100 p-4 last:border-0 md:grid-cols-4">
              <p className="font-black text-brasil-navy">{item.match}</p>
              <p className="font-semibold text-slate-600">{item.guess}</p>
              <p className="font-semibold text-slate-600">{item.points} pontos</p>
              <p className="font-black text-brasil-green">{item.status}</p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

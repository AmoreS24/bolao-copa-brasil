import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageShell, SectionTitle } from "@/components/ui";
import { RankingBonusForm } from "@/components/ranking-bonus-form";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isPaidStatus(status: unknown) {
  return status === "paid" || status === "pago";
}

function MessageBox({ title, message }: { title: string; message: string }) {
  return (
    <PageShell>
      <section className="mx-auto max-w-2xl rounded-lg bg-white p-5 shadow-field md:p-7">
        <SectionTitle eyebrow="Ranking da Torcida" title={title} />
        <p className="font-semibold leading-relaxed text-slate-600">{message}</p>
        <Link href="/" className="mt-5 inline-flex rounded-full bg-brasil-blue px-5 py-3 font-black text-white">
          Voltar ao início
        </Link>
      </section>
    </PageShell>
  );
}

export default async function RankingBonusPage({
  searchParams
}: {
  searchParams?: { pagamento?: string };
}) {
  const user = getCurrentUser();

  if (!user) {
    return (
      <MessageBox
        title="Login necessário"
        message="Faça login para ativar sua participação extra no Ranking da Torcida Brasileira."
      />
    );
  }

  const supabase = getSupabaseServerClient();
  const paymentId = searchParams?.pagamento;

  if (!supabase || !paymentId) {
    return <MessageBox title="Pagamento não encontrado" message="Volte para a tela de pagamento e tente novamente." />;
  }

  const { data: payment } = await supabase
    .from("pagamentos")
    .select("id,perfil_id,status")
    .eq("id", paymentId)
    .eq("perfil_id", user.id)
    .maybeSingle();

  if (!payment) {
    return <MessageBox title="Pagamento não encontrado" message="Não encontramos esse pagamento para o seu usuário." />;
  }

  if (!isPaidStatus((payment as DbRow).status)) {
    return (
      <MessageBox
        title="Pagamento ainda pendente"
        message="O bônus da torcida é liberado somente depois que o pagamento estiver aprovado."
      />
    );
  }

  const { data: guess } = await supabase
    .from("apostas")
    .select("jogo_id")
    .eq("pagamento_id", paymentId)
    .eq("perfil_id", user.id)
    .limit(1)
    .maybeSingle();
  const gameId = asString((guess as DbRow | null)?.jogo_id);

  if (!gameId) {
    return <MessageBox title="Jogo não encontrado" message="Não encontramos o jogo vinculado a este pagamento." />;
  }

  const { data: existingVote } = await supabase
    .from("torcida_votos")
    .select("id")
    .eq("perfil_id", user.id)
    .eq("jogo_id", gameId)
    .maybeSingle();

  if (existingVote) {
    return (
      <MessageBox
        title="Participação já ativada"
        message="Você já ativou sua participação no Ranking da Torcida para este jogo."
      />
    );
  }

  return (
    <PageShell>
      <section className="mx-auto max-w-3xl">
        <div className="mb-5 rounded-lg bg-brasil-navy p-5 text-white shadow-field md:p-7">
          <Trophy className="mb-3 text-brasil-yellow" size={34} aria-hidden />
          <p className="font-black uppercase text-brasil-yellow">Bônus da torcida</p>
          <h1 className="mt-1 text-3xl font-black md:text-4xl">Ative sua participação extra</h1>
          <p className="mt-3 font-semibold leading-relaxed text-white/85">
            Seu palpite já está validado. Agora ative sua participação extra no Ranking da Torcida Brasileira e
            aumente suas chances de aparecer entre os melhores torcedores do jogo.
          </p>
        </div>
        <RankingBonusForm paymentId={paymentId} />
      </section>
    </PageShell>
  );
}

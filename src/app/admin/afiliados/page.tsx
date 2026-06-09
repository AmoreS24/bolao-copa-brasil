import Link from "next/link";
import { PageShell, SectionTitle } from "@/components/ui";
import { AdminAffiliatesManager, type AdminAffiliate } from "@/components/admin-affiliates-manager";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

type DbRow = Record<string, unknown>;

function asNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function AccessRestricted() {
  return (
    <PageShell>
      <section className="rounded-lg bg-white p-6 shadow-field">
        <SectionTitle eyebrow="Afiliados" title="Acesso restrito" />
        <p className="font-semibold text-slate-600">Esta área é exclusiva para o usuário master.</p>
      </section>
    </PageShell>
  );
}

async function affiliateStats(codigo: string) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return { cadastros: 0, pagamentosPagos: 0, valorPago: 0 };
  }

  const [{ count: cadastros }, { count: pagamentosPagos }, { data: paidPayments }] = await Promise.all([
    supabase.from("perfis").select("id", { count: "exact", head: true }).eq("origem_ref", codigo),
    supabase
      .from("pagamentos")
      .select("id", { count: "exact", head: true })
      .eq("origem_ref", codigo)
      .eq("status", "paid"),
    supabase.from("pagamentos").select("valor_total").eq("origem_ref", codigo).eq("status", "paid")
  ]);

  const valorPago = ((paidPayments ?? []) as DbRow[]).reduce(
    (total, payment) => total + asNumber(payment.valor_total),
    0
  );

  return {
    cadastros: cadastros ?? 0,
    pagamentosPagos: pagamentosPagos ?? 0,
    valorPago
  };
}

export default async function AdminAffiliatesPage() {
  const user = getCurrentUser();

  if (!isMasterUser(user)) {
    return <AccessRestricted />;
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return <AccessRestricted />;
  }

  const { data, error } = await supabase
    .from("afiliados")
    .select("id,nome,codigo,link,criado_em")
    .order("criado_em", { ascending: false });

  const rows = error ? [] : ((data ?? []) as DbRow[]);
  const affiliates: AdminAffiliate[] = await Promise.all(
    rows.map(async (row) => {
      const codigo = asString(row.codigo);
      const stats = await affiliateStats(codigo);

      return {
        id: asString(row.id),
        nome: asString(row.nome),
        codigo,
        link: asString(row.link),
        ...stats
      };
    })
  );

  return (
    <PageShell>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-black uppercase text-brasil-green">Painel administrativo</p>
          <h1 className="text-3xl font-black text-brasil-navy md:text-4xl">Links de divulgação</h1>
        </div>
        <Link href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-full bg-brasil-yellow px-5 font-black text-brasil-navy shadow-field">
          Voltar ao admin
        </Link>
      </div>
      <AdminAffiliatesManager affiliates={affiliates} />
    </PageShell>
  );
}

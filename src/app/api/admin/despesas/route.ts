import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type ExpenseRequest = {
  jogo_id?: string;
  descricao?: string;
  valor?: number;
};

function clean(value?: string) {
  return value?.trim() ?? "";
}

function asNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function POST(request: Request) {
  const user = getCurrentUser();

  if (!user || !isMasterUser(user)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ExpenseRequest;
  const jogoId = clean(body.jogo_id);
  const descricao = clean(body.descricao);
  const valor = asNumber(body.valor);

  if (!jogoId || !descricao || valor === null || valor <= 0) {
    return NextResponse.json({ error: "Informe rodada, descrição e valor da despesa." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("rodada_despesas")
    .insert({
      jogo_id: jogoId,
      descricao,
      valor
    })
    .select("id,jogo_id,descricao,valor,criado_em")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Não foi possível salvar a despesa." }, { status: 400 });
  }

  return NextResponse.json({ despesa: data });
}

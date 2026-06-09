import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isMasterUser } from "@/lib/admin";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type AffiliateRequest = {
  nome?: string;
  codigo?: string;
};

const PUBLIC_BASE_URL = "https://bolao-copa-brasil.vercel.app";

function clean(value?: string) {
  return value?.trim() ?? "";
}

function normalizeCode(value?: string) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function POST(request: Request) {
  const user = getCurrentUser();

  if (!isMasterUser(user)) {
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as AffiliateRequest;
  const nome = clean(body.nome);
  const codigo = normalizeCode(body.codigo);

  if (!nome || !codigo) {
    return NextResponse.json({ error: "Informe nome e código do link." }, { status: 400 });
  }

  const link = `${PUBLIC_BASE_URL}?ref=${encodeURIComponent(codigo)}`;
  const { data, error } = await supabase
    .from("afiliados")
    .insert({ nome, codigo, link })
    .select("id,nome,codigo,link,criado_em")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Este código já está cadastrado." }, { status: 409 });
    }

    return NextResponse.json({ error: error?.message ?? "Não foi possível salvar o afiliado." }, { status: 400 });
  }

  return NextResponse.json({ afiliado: data });
}

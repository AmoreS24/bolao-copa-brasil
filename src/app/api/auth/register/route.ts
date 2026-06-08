import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type RegisterRequest = {
  nome?: string;
  email?: string;
  telefone?: string;
  cpf?: string;
  senha?: string;
};

function clean(value?: string) {
  return value?.trim() ?? "";
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as RegisterRequest;
  const nome = clean(body.nome);
  const email = clean(body.email).toLowerCase();
  const telefone = clean(body.telefone);
  const cpf = clean(body.cpf);
  const senha = body.senha ?? "";

  if (!nome || !email || !telefone || !cpf || !senha) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("perfis")
    .insert({
      nome,
      email,
      telefone,
      cpf,
      senha_hash: hashPassword(senha)
    })
    .select("id,nome,email")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? "Não foi possível criar o cadastro." }, { status: 400 });
  }

  const response = NextResponse.json({ user: data });
  response.cookies.set(SESSION_COOKIE, createSessionToken(data), sessionCookieOptions);

  return response;
}

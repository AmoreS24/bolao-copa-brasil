import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type LoginRequest = {
  email?: string;
  senha?: string;
};

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as LoginRequest;
  const email = body.email?.trim().toLowerCase() ?? "";
  const senha = body.senha ?? "";

  if (!email || !senha) {
    return NextResponse.json({ error: "Informe email e senha." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("perfis")
    .select("id,nome,email,senha_hash")
    .eq("email", email)
    .maybeSingle();

  if (error || !data || !verifyPassword(senha, data.senha_hash ?? "")) {
    return NextResponse.json({ error: "Email ou senha inválidos." }, { status: 401 });
  }

  const user = {
    id: data.id,
    nome: data.nome,
    email: data.email
  };
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);

  return response;
}

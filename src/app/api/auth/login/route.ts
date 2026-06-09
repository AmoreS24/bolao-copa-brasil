import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type LoginRequest = {
  telefone?: string;
  senha?: string;
};

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-login", { limit: 8, windowMs: 60 * 1000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns segundos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as LoginRequest;
  const telefone = body.telefone?.trim() ?? "";
  const senha = body.senha ?? "";

  if (!telefone || !senha) {
    return NextResponse.json({ error: "Informe telefone e senha." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("perfis")
    .select("id,nome,telefone,senha_hash")
    .eq("telefone", telefone)
    .maybeSingle();

  if (error || !data || !verifyPassword(senha, data.senha_hash ?? "")) {
    return NextResponse.json({ error: "Telefone ou senha inválidos." }, { status: 401 });
  }

  const user = {
    id: data.id,
    nome: data.nome,
    telefone: data.telefone
  };
  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions);

  return response;
}

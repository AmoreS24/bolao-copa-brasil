import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type ResetPasswordRequest = {
  telefone?: string;
  cpf?: string;
  novaSenha?: string;
  confirmarSenha?: string;
};

const NEUTRAL_ERROR = "Não foi possível redefinir a senha com os dados informados.";

function clean(value?: string) {
  return value?.trim() ?? "";
}

function digitsOnly(value?: string) {
  return clean(value).replace(/\D/g, "");
}

export async function POST(request: Request) {
  const limit = rateLimit(request, "auth-reset-password", { limit: 5, windowMs: 10 * 60 * 1000 });

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
    );
  }

  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json().catch(() => ({}))) as ResetPasswordRequest;
  const telefone = digitsOnly(body.telefone);
  const cpf = digitsOnly(body.cpf);
  const novaSenha = body.novaSenha ?? "";
  const confirmarSenha = body.confirmarSenha ?? "";

  if (!telefone || !cpf || !novaSenha || !confirmarSenha) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  if (cpf.length !== 11) {
    return NextResponse.json({ error: "CPF inválido. Digite os 11 números do CPF." }, { status: 400 });
  }

  if (novaSenha.length < 6) {
    return NextResponse.json({ error: "A nova senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  if (novaSenha !== confirmarSenha) {
    return NextResponse.json({ error: "A nova senha e a confirmação devem ser iguais." }, { status: 400 });
  }

  const { data: profile, error: profileError } = await supabase
    .from("perfis")
    .select("id")
    .eq("telefone", telefone)
    .eq("cpf", cpf)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: NEUTRAL_ERROR }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("perfis")
    .update({ senha_hash: hashPassword(novaSenha) })
    .eq("id", profile.id);

  if (updateError) {
    return NextResponse.json({ error: NEUTRAL_ERROR }, { status: 400 });
  }

  return NextResponse.json({ ok: true, message: "Senha alterada com sucesso. Faça login novamente." });
}

import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type RegisterRequest = {
  nome?: string;
  telefone?: string;
  cpf?: string;
  senha?: string;
  origem_ref?: string;
};

const ALLOWED_REFS = new Set(["erick", "luana", "reis", "wallison", "donarosa", "alta-news"]);

function clean(value?: string) {
  return value?.trim() ?? "";
}

function digitsOnly(value?: string) {
  return clean(value).replace(/\D/g, "");
}

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function normalizeReferral(value?: string) {
  const ref = clean(value).toLowerCase();
  return ALLOWED_REFS.has(ref) ? ref : "";
}

function isMissingOriginColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST204" || Boolean(error?.message?.includes("origem_ref"));
}

export async function POST(request: Request) {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const body = (await request.json()) as RegisterRequest;
  const nome = clean(body.nome);
  const telefone = digitsOnly(body.telefone);
  const cpf = digitsOnly(body.cpf);
  const senha = body.senha ?? "";
  const origemRef = normalizeReferral(body.origem_ref) || normalizeReferral(cookieValue(request, "origem_ref"));

  if (!nome || !telefone || !cpf || !senha) {
    return NextResponse.json({ error: "Preencha todos os campos obrigatórios." }, { status: 400 });
  }

  if (senha.length < 6) {
    return NextResponse.json({ error: "A senha deve ter pelo menos 6 caracteres." }, { status: 400 });
  }

  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("perfis")
    .select("id")
    .or(`cpf.eq.${cpf},telefone.eq.${telefone}`)
    .maybeSingle();

  if (existingProfileError) {
    return NextResponse.json({ error: "Não foi possível validar o cadastro." }, { status: 400 });
  }

  if (existingProfile) {
    return NextResponse.json({ error: "CPF ou WhatsApp já cadastrado." }, { status: 409 });
  }

  const profilePayload: Record<string, string> = {
    nome,
    telefone,
    cpf,
    senha_hash: hashPassword(senha)
  };

  if (origemRef) {
    profilePayload.origem_ref = origemRef;
  }

  let { data, error } = await supabase
    .from("perfis")
    .insert(profilePayload)
    .select("id,nome,telefone")
    .single();

  if (error && origemRef && isMissingOriginColumnError(error)) {
    delete profilePayload.origem_ref;
    const retry = await supabase
      .from("perfis")
      .insert(profilePayload)
      .select("id,nome,telefone")
      .single();
    data = retry.data;
    error = retry.error;
  }

  if (error || !data) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "CPF ou WhatsApp já cadastrado." }, { status: 409 });
    }

    return NextResponse.json({ error: error?.message ?? "Não foi possível criar o cadastro." }, { status: 400 });
  }

  const response = NextResponse.json({ user: data });
  response.cookies.set(SESSION_COOKIE, createSessionToken(data), sessionCookieOptions);

  return response;
}

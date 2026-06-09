import { NextResponse } from "next/server";
import { getMatchById } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type PixRequest = {
  matchId?: string;
  guesses?: Array<{ home: number; away: number }>;
};

type AsaasResponse = {
  id?: string;
  encodedImage?: string;
  payload?: string;
  errors?: Array<{ description?: string }>;
};

type AsaasFetchResult = {
  status: number;
  payload: AsaasResponse;
};

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;

function getAsaasBaseUrl() {
  return process.env.ASAAS_ENV === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

function asCurrencyValue(value: number) {
  return Number(value.toFixed(2));
}

function cleanNumber(value: string) {
  return value.replace(/\D/g, "");
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function asaasFetch(path: string, init: RequestInit): Promise<AsaasFetchResult> {
  const apiKey = process.env.ASAAS_API_KEY;

  if (!apiKey) {
    throw new Error("ASAAS_API_KEY não configurada. Não foi possível gerar o Pix.");
  }

  const response = await fetch(`${getAsaasBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
      ...(init.headers ?? {})
    }
  });
  const payload = (await response.json().catch(() => ({}))) as AsaasResponse;

  if (!response.ok) {
    throw new Error(payload.errors?.[0]?.description || "Erro ao comunicar com o Asaas.");
  }

  return {
    status: response.status,
    payload
  };
}

export async function POST(request: Request) {
  try {
    const [body, user] = await Promise.all([
      request.json() as Promise<PixRequest>,
      getCurrentUser()
    ]);
    const guesses = body.guesses ?? [];

    if (!user) {
      return NextResponse.json({ error: "Faça login para gerar o Pix." }, { status: 401 });
    }

    if (!body.matchId) {
      return NextResponse.json({ error: "Jogo não informado." }, { status: 400 });
    }

    if (guesses.length === 0) {
      return NextResponse.json({ error: "Informe pelo menos um palpite." }, { status: 400 });
    }

    const [match, supabase] = await Promise.all([getMatchById(body.matchId), Promise.resolve(getSupabaseServerClient())]);

    if (!match) {
      return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("perfis")
      .select("id,nome,telefone,cpf")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const subtotal = asCurrencyValue(guesses.length * ENTRY_VALUE);
    const total = asCurrencyValue(subtotal + OPERATIONAL_FEE);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const customerResult = await asaasFetch("/customers", {
      method: "POST",
      body: JSON.stringify({
        name: profile.nome,
        cpfCnpj: cleanNumber(profile.cpf ?? ""),
        mobilePhone: cleanNumber(profile.telefone ?? "")
      })
    });
    const customer = customerResult.payload;

    if (!customer.id) {
      return NextResponse.json({ error: "Não foi possível criar o cliente no Asaas." }, { status: 502 });
    }

    const paymentResult = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify({
        customer: customer.id,
        billingType: "PIX",
        value: total,
        dueDate: tomorrowDate(),
        description: `Bolão ${match.homeTeam} x ${match.awayTeam} - ${guesses.length} palpite(s)`,
        externalReference: `${user.id}:${match.id}:${Date.now()}`
      })
    });
    const payment = paymentResult.payload;

    console.log("[Asaas Pix] cobrança criada", {
      status: paymentResult.status,
      asaasPaymentId: payment.id ?? null
    });

    if (!payment.id) {
      return NextResponse.json({ error: "Não foi possível criar a cobrança no Asaas." }, { status: 502 });
    }

    const pixQrCodeResult = await asaasFetch(`/payments/${payment.id}/pixQrCode`, {
      method: "GET"
    });
    const pixQrCode = pixQrCodeResult.payload;

    console.log("[Asaas Pix] pixQrCode recebido", {
      status: pixQrCodeResult.status,
      asaasPaymentId: payment.id,
      keys: Object.keys(pixQrCode),
      hasEncodedImage: Boolean(pixQrCode.encodedImage),
      hasPayload: Boolean(pixQrCode.payload),
      payloadPreview: pixQrCode.payload ? `${pixQrCode.payload.slice(0, 24)}...` : null
    });

    const { data: savedPayment, error: paymentError } = await supabase
      .from("pagamentos")
      .insert({
        perfil_id: user.id,
        asaas_payment_id: payment.id,
        valor_total: total,
        valor_palpites: subtotal,
        taxa_operacional: OPERATIONAL_FEE,
        status: "pending",
        pix_qr_code: pixQrCode.encodedImage ?? null,
        pix_copia_cola: pixQrCode.payload ?? null,
        expira_em: expiresAt.toISOString()
      })
      .select("id")
      .single();

    if (paymentError || !savedPayment) {
      return NextResponse.json({ error: paymentError?.message ?? "Não foi possível salvar o pagamento." }, { status: 500 });
    }

    const { error: guessesError } = await supabase
      .from("apostas")
      .insert(
        guesses.map((guess) => ({
          pagamento_id: savedPayment.id,
          perfil_id: user.id,
          jogo_id: match.id,
          gols_brasil: guess.home,
          gols_adversario: guess.away,
          status: "pending_payment"
        }))
      );

    if (guessesError) {
      return NextResponse.json({ error: guessesError.message }, { status: 500 });
    }

    return NextResponse.json({
      payment: {
        id: savedPayment.id,
        status: "pending",
        total
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o Pix." },
      { status: 500 }
    );
  }
}

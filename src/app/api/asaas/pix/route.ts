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
  copyPaste?: string;
  expirationDate?: string;
  errors?: Array<{ description?: string }>;
  [key: string]: unknown;
};

type AsaasFetchResult = {
  status: number;
  payload: AsaasResponse;
};

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;

class AsaasApiError extends Error {
  status: number;
  payload: AsaasResponse;

  constructor(message: string, status: number, payload: AsaasResponse) {
    super(message);
    this.name = "AsaasApiError";
    this.status = status;
    this.payload = payload;
  }
}

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

function readTextField(payload: AsaasResponse, keys: string[]) {
  for (const key of keys) {
    const value = payload[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
}

function normalizePixQrCode(payload: AsaasResponse) {
  return {
    encodedImage: readTextField(payload, ["encodedImage", "encoded_image", "qrCode", "qr_code"]),
    copyPaste: readTextField(payload, ["payload", "copyPaste", "copy_paste", "pixCopyPaste", "pix_copy_paste"]),
    expirationDate: readTextField(payload, ["expirationDate", "expiration_date"]),
    keys: Object.keys(payload)
  };
}

function logPixError(error: unknown) {
  console.error("ASAAS PIX ERROR:", error);
  console.error(error instanceof Error ? error.stack : undefined);
}

function getSupabaseErrorDetails(error: unknown) {
  if (!error || typeof error !== "object") {
    return null;
  }

  const details = error as Record<string, unknown>;

  return {
    code: details.code,
    message: details.message,
    details: details.details,
    hint: details.hint
  };
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
    throw new AsaasApiError(payload.errors?.[0]?.description || "Erro ao comunicar com o Asaas.", response.status, payload);
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
      logPixError(new Error("Supabase não configurado."));
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

    const paymentPayload = {
      customer: customer.id,
      billingType: "PIX",
      value: total,
      dueDate: tomorrowDate(),
      description: `Bolão ${match.homeTeam} x ${match.awayTeam} - ${guesses.length} palpite(s)`,
      externalReference: `${user.id}:${match.id}:${Date.now()}`
    };

    console.log("[Asaas Pix] criando cobrança", {
      customer: paymentPayload.customer,
      billingType: paymentPayload.billingType,
      value: paymentPayload.value,
      dueDate: paymentPayload.dueDate,
      description: paymentPayload.description
    });

    const paymentResult = await asaasFetch("/payments", {
      method: "POST",
      body: JSON.stringify(paymentPayload)
    });
    const payment = paymentResult.payload;

    console.log("[Asaas Pix] cobrança criada", {
      status: paymentResult.status,
      asaasPaymentId: payment.id ?? null,
      keys: Object.keys(payment),
      billingType: payment.billingType ?? null
    });

    if (!payment.id) {
      return NextResponse.json({ error: "Não foi possível criar a cobrança no Asaas." }, { status: 502 });
    }

    let pixQrCodeResult: AsaasFetchResult;

    try {
      pixQrCodeResult = await asaasFetch(`/payments/${payment.id}/pixQrCode`, {
        method: "GET"
      });
    } catch (error) {
      if (error instanceof AsaasApiError) {
        console.log("[Asaas Pix] erro ao buscar pixQrCode", {
          status: error.status,
          asaasPaymentId: payment.id,
          response: {
            keys: Object.keys(error.payload),
            errors: error.payload.errors
          }
        });

        return NextResponse.json(
          { error: "Não foi possível gerar o Pix. Tente novamente." },
          { status: 502 }
        );
      }

      throw error;
    }

    const pixQrCode = pixQrCodeResult.payload;
    const normalizedPixQrCode = normalizePixQrCode(pixQrCode);

    console.log("[Asaas Pix] pixQrCode recebido", {
      status: pixQrCodeResult.status,
      asaasPaymentId: payment.id,
      keys: normalizedPixQrCode.keys,
      hasEncodedImage: Boolean(normalizedPixQrCode.encodedImage),
      hasPayload: Boolean(normalizedPixQrCode.copyPaste),
      hasExpirationDate: Boolean(normalizedPixQrCode.expirationDate),
      payloadPreview: normalizedPixQrCode.copyPaste ? `${normalizedPixQrCode.copyPaste.slice(0, 24)}...` : null
    });

    console.log("[Asaas Pix] salvando pagamento", {
      asaasPaymentId: payment.id,
      value: total,
      hasQrCode: Boolean(normalizedPixQrCode.encodedImage),
      hasPixPayload: Boolean(normalizedPixQrCode.copyPaste)
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
        pix_qr_code: normalizedPixQrCode.encodedImage,
        pix_copia_cola: normalizedPixQrCode.copyPaste,
        expira_em: expiresAt.toISOString()
      })
      .select("id")
      .single();

    if (paymentError || !savedPayment) {
      const error = paymentError ?? new Error("Pagamento não retornado após insert.");
      logPixError(error);
      console.log("[Asaas Pix] erro ao salvar pagamento", {
        asaasPaymentId: payment.id,
        error: getSupabaseErrorDetails(error)
      });

      return NextResponse.json({ error: paymentError?.message ?? "Não foi possível salvar o pagamento." }, { status: 500 });
    }

    console.log("[Asaas Pix] pagamento salvo", {
      paymentId: savedPayment.id,
      asaasPaymentId: payment.id
    });

    console.log("[Asaas Pix] salvando apostas", {
      paymentId: savedPayment.id,
      quantidade: guesses.length
    });

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
      logPixError(guessesError);
      console.log("[Asaas Pix] erro ao salvar apostas", {
        paymentId: savedPayment.id,
        error: getSupabaseErrorDetails(guessesError)
      });

      return NextResponse.json({ error: guessesError.message }, { status: 500 });
    }

    console.log("[Asaas Pix] apostas salvas", {
      paymentId: savedPayment.id,
      quantidade: guesses.length
    });

    return NextResponse.json({
      payment: {
        id: savedPayment.id,
        status: "pending",
        total
      }
    });
  } catch (error) {
    logPixError(error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível gerar o Pix." },
      { status: 500 }
    );
  }
}

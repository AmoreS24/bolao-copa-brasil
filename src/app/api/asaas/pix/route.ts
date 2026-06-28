import { NextResponse } from "next/server";
import { getActiveMatch, getMatchById } from "@/data/supabase-live";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseServerClient } from "@/lib/supabase-server";

type PixRequest = {
  matchId?: string;
  guesses?: Array<{ home: number; away: number }>;
  origem_ref?: string;
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

type ProfileRow = Record<string, unknown> & {
  id?: string;
  nome?: string;
  telefone?: string;
  cpf?: string;
  origem_ref?: string;
};

const ENTRY_VALUE = 10;
const OPERATIONAL_FEE = 1.99;
const PIX_EXPIRATION_MINUTES = 5;
const ALLOWED_REFS = new Set(["erick", "luana", "reis", "wallison", "donarosa", "alta-news"]);

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

function cookieValue(request: Request, name: string) {
  const cookies = request.headers.get("cookie") ?? "";
  const match = cookies.split(";").map((cookie) => cookie.trim()).find((cookie) => cookie.startsWith(`${name}=`));

  return match ? decodeURIComponent(match.slice(name.length + 1)) : "";
}

function normalizeReferral(value?: string) {
  const ref = value?.trim().toLowerCase() ?? "";
  return ALLOWED_REFS.has(ref) ? ref : "";
}

function isMissingOriginColumnError(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST204" || Boolean(error?.message?.includes("origem_ref"));
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
    const limit = rateLimit(request, "asaas-pix", { limit: 10, windowMs: 60 * 1000 });

    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Muitas tentativas de gerar Pix. Aguarde alguns segundos e tente novamente." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const [body, user] = await Promise.all([
      request.json() as Promise<PixRequest>,
      getCurrentUser()
    ]);
    const guesses = body.guesses ?? [];
    const origemRef = normalizeReferral(body.origem_ref) || normalizeReferral(cookieValue(request, "origem_ref"));

    if (!user) {
      return NextResponse.json({ error: "Faça login para gerar o Pix." }, { status: 401 });
    }

    if (!body.matchId) {
      return NextResponse.json({ error: "Jogo não informado." }, { status: 400 });
    }

    if (guesses.length === 0) {
      return NextResponse.json({ error: "Informe pelo menos um palpite." }, { status: 400 });
    }

    const [match, activeMatch, supabase] = await Promise.all([
      getMatchById(body.matchId),
      getActiveMatch(),
      Promise.resolve(getSupabaseServerClient())
    ]);

    if (!match) {
      return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    }

    if (!activeMatch || match.id !== activeMatch.id || activeMatch.status !== "aberto") {
      return NextResponse.json(
        { error: "Esta rodada não está aberta para palpites. Abra a rodada atual e tente novamente." },
        { status: 400 }
      );
    }

    if (!supabase) {
      logPixError(new Error("Supabase não configurado."));
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
    }

    const profileResult = await supabase
      .from("perfis")
      .select("id,nome,telefone,cpf,origem_ref")
      .eq("id", user.id)
      .maybeSingle();
    let profile = profileResult.data as ProfileRow | null;
    let profileError = profileResult.error;

    if (profileError && isMissingOriginColumnError(profileError)) {
      const retry = await supabase
        .from("perfis")
        .select("id,nome,telefone,cpf")
        .eq("id", user.id)
        .maybeSingle();
      profile = retry.data as ProfileRow | null;
      profileError = retry.error;
    }

    if (profileError || !profile) {
      return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
    }

    const normalizedCpf = cleanNumber(profile.cpf ?? "");

    if (normalizedCpf.length !== 11) {
      return NextResponse.json(
        { error: "CPF inválido no cadastro. Corrija seus dados antes de gerar o Pix." },
        { status: 400 }
      );
    }

    const subtotal = asCurrencyValue(guesses.length * ENTRY_VALUE);
    const total = asCurrencyValue(subtotal + OPERATIONAL_FEE);
    const expiresAt = new Date(Date.now() + PIX_EXPIRATION_MINUTES * 60 * 1000);
    const paymentOriginRef = origemRef || normalizeReferral(profile.origem_ref as string | undefined);

    console.log("STEP 1 OK");

    let customerResult: AsaasFetchResult;

    try {
      customerResult = await asaasFetch("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: profile.nome,
          cpfCnpj: normalizedCpf,
          mobilePhone: cleanNumber(profile.telefone ?? "")
        })
      });
    } catch (error) {
      console.error("FAILED STEP 2", error);
      throw error;
    }

    console.log("STEP 2 OK");

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

    console.log("STEP 3 OK");

    let paymentResult: AsaasFetchResult;

    try {
      paymentResult = await asaasFetch("/payments", {
        method: "POST",
        body: JSON.stringify(paymentPayload)
      });
    } catch (error) {
      console.error("FAILED STEP 4", error);
      throw error;
    }

    console.log("STEP 4 OK");

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

    console.log("STEP 5 OK");

    try {
      pixQrCodeResult = await asaasFetch(`/payments/${payment.id}/pixQrCode`, {
        method: "GET"
      });
    } catch (error) {
      console.error("FAILED STEP 6", error);

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

    console.log("STEP 6 OK");

    const pixQrCode = pixQrCodeResult.payload;
    const normalizedPixQrCode = normalizePixQrCode(pixQrCode);

    console.log("[Asaas Pix] pixQrCode recebido", {
      status: pixQrCodeResult.status,
      asaasPaymentId: payment.id,
      keys: normalizedPixQrCode.keys,
      hasEncodedImage: Boolean(normalizedPixQrCode.encodedImage),
      encodedImageLength: normalizedPixQrCode.encodedImage.length,
      encodedImagePreview: normalizedPixQrCode.encodedImage.slice(0, 50),
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

    console.log("STEP 7 OK");

    const paymentInsertPayload: Record<string, unknown> = {
      perfil_id: user.id,
      asaas_payment_id: payment.id,
      valor_total: total,
      valor_palpites: subtotal,
      taxa_operacional: OPERATIONAL_FEE,
      status: "pending",
      pix_qr_code: normalizedPixQrCode.encodedImage,
      pix_copia_cola: normalizedPixQrCode.copyPaste,
      expira_em: expiresAt.toISOString()
    };

    if (paymentOriginRef) {
      paymentInsertPayload.origem_ref = paymentOriginRef;
    }

    let { data: savedPayment, error: paymentError } = await supabase
      .from("pagamentos")
      .insert(paymentInsertPayload)
      .select("id,pix_qr_code")
      .single();

    if (paymentError && paymentOriginRef && isMissingOriginColumnError(paymentError)) {
      delete paymentInsertPayload.origem_ref;
      const retry = await supabase
        .from("pagamentos")
        .insert(paymentInsertPayload)
        .select("id,pix_qr_code")
        .single();
      savedPayment = retry.data;
      paymentError = retry.error;
    }

    if (paymentError || !savedPayment) {
      const error = paymentError ?? new Error("Pagamento não retornado após insert.");
      console.error("FAILED STEP 8", error);
      logPixError(error);
      console.log("[Asaas Pix] erro ao salvar pagamento", {
        asaasPaymentId: payment.id,
        error: getSupabaseErrorDetails(error)
      });

      return NextResponse.json({ error: paymentError?.message ?? "Não foi possível salvar o pagamento." }, { status: 500 });
    }

    console.log("STEP 8 OK");

    console.log("[Asaas Pix] pagamento salvo", {
      paymentId: savedPayment.id,
      asaasPaymentId: payment.id,
      pixQrCodeLength: typeof savedPayment.pix_qr_code === "string" ? savedPayment.pix_qr_code.length : 0,
      pixQrCodePreview: typeof savedPayment.pix_qr_code === "string" ? savedPayment.pix_qr_code.slice(0, 50) : ""
    });

    console.log("[Asaas Pix] salvando apostas", {
      paymentId: savedPayment.id,
      quantidade: guesses.length
    });

    console.log("STEP 9 OK");

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
      console.error("FAILED STEP 10", guessesError);
      logPixError(guessesError);
      console.log("[Asaas Pix] erro ao salvar apostas", {
        paymentId: savedPayment.id,
        error: getSupabaseErrorDetails(guessesError)
      });

      return NextResponse.json({ error: guessesError.message }, { status: 500 });
    }

    console.log("STEP 10 OK");

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

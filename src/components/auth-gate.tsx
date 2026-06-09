"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, LogIn, LogOut, UserPlus, X } from "lucide-react";

type AuthUser = {
  id: string;
  nome: string;
  telefone: string;
};

type AuthMode = "login" | "register";

type AuthGateProps = {
  redirectTo?: string;
  children?: ReactNode;
  variant?: "cta" | "header" | "compact";
};

async function parseResponse(response: Response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || "Não foi possível concluir a ação.");
  }

  return payload as { user: AuthUser | null };
}

export function AuthGate({ redirectTo, children = "Entrar", variant = "cta" }: AuthGateProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(parseResponse)
      .then((payload) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  function openAuth(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setOpen(true);
  }

  async function handlePrimaryClick() {
    if (user && redirectTo) {
      router.push(redirectTo);
      return;
    }

    if (user) {
      return;
    }

    if (checkingSession) {
      try {
        const payload = await parseResponse(await fetch("/api/auth/me", { cache: "no-store" }));
        setUser(payload.user);

        if (payload.user && redirectTo) {
          router.push(redirectTo);
          return;
        }

        if (payload.user) {
          return;
        }
      } catch {
        setUser(null);
      } finally {
        setCheckingSession(false);
      }
    }

    openAuth("login");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = await parseResponse(response);

      setUser(payload.user);
      setOpen(false);
      router.refresh();

      if (redirectTo) {
        router.push(redirectTo);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir a ação.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.refresh();
  }

  const buttonClass =
    variant === "header"
      ? "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-brasil-blue px-4 py-2 text-sm font-black text-white shadow-field transition hover:-translate-y-0.5"
      : variant === "compact"
        ? "inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-brasil-yellow px-4 text-sm font-black text-brasil-navy shadow-field transition hover:-translate-y-0.5 sm:w-auto"
        : "hero-cta inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-brasil-yellow px-7 py-3 text-center text-lg font-black text-brasil-navy shadow-field transition hover:-translate-y-0.5 sm:w-auto";

  return (
    <>
      {variant === "header" && user ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden max-w-40 truncate text-sm font-black text-brasil-navy sm:block">
            Bem-vindo, {user.nome}
          </span>
          <button
            type="button"
            onClick={logout}
            className="grid h-11 w-11 place-items-center rounded-full bg-brasil-light text-brasil-blue shadow-field"
            aria-label="Sair"
          >
            <LogOut size={18} aria-hidden />
          </button>
        </div>
      ) : (
        <button type="button" onClick={handlePrimaryClick} className={buttonClass}>
          {variant === "header" ? <LogIn size={17} aria-hidden /> : null}
          {children}
          {variant === "cta" || variant === "compact" ? <ArrowRight size={variant === "compact" ? 17 : 22} aria-hidden /> : null}
        </button>
      )}

      {variant === "cta" && user ? (
        <p className="mt-3 text-sm font-black text-white">Bem-vindo, {user.nome}</p>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4 py-6">
          <section className="relative w-full max-w-md rounded-lg bg-white p-5 text-left text-brasil-navy shadow-[0_24px_70px_rgba(0,0,0,0.35)] md:p-6">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-brasil-light text-brasil-blue"
              aria-label="Fechar"
            >
              <X size={18} aria-hidden />
            </button>
            <div className="mb-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-brasil-green">
                {mode === "login" ? "Entrar" : "Criar cadastro"}
              </p>
              <h2 className="text-2xl font-black text-brasil-navy">
                {mode === "login" ? "Acesse sua conta" : "Entre no bolão"}
              </h2>
            </div>

            <form onSubmit={submit} className="grid gap-3">
              {mode === "register" ? (
                <>
                  <input name="nome" required placeholder="Nome" className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
                  <input name="cpf" required placeholder="CPF" className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
                </>
              ) : null}
              <input name="telefone" required placeholder="Telefone / WhatsApp" className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />
              <input name="senha" required type="password" placeholder="Senha" className="min-h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-brasil-green" />

              {message ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{message}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field disabled:opacity-65"
              >
                {mode === "login" ? <LogIn size={18} aria-hidden /> : <UserPlus size={18} aria-hidden />}
                {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar cadastro"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => openAuth(mode === "login" ? "register" : "login")}
              className="mt-4 w-full text-center text-sm font-black text-brasil-blue"
            >
              {mode === "login" ? "Não tenho conta. Criar cadastro" : "Já tenho conta. Entrar"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}

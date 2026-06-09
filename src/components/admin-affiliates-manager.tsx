"use client";

import { FormEvent, useState } from "react";
import { Copy, Link2, Plus } from "lucide-react";
import { currency } from "@/lib/utils";

export type AdminAffiliate = {
  id: string;
  nome: string;
  codigo: string;
  link: string;
  cadastros: number;
  pagamentosPagos: number;
  valorPago: number;
};

function normalizeCode(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminAffiliatesManager({ affiliates }: { affiliates: AdminAffiliate[] }) {
  const [items, setItems] = useState(affiliates);
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [copiedId, setCopiedId] = useState("");

  async function copyLink(id: string, link: string) {
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(""), 1600);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch("/api/admin/afiliados", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || "Não foi possível criar o link.");
      }

      setItems((current) => [
        {
          ...payload.afiliado,
          cadastros: 0,
          pagamentosPagos: 0,
          valorPago: 0
        },
        ...current
      ]);
      setNome("");
      setCodigo("");
      setMessage("Link criado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar o link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-lg bg-white p-5 shadow-field md:p-6">
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-[1fr_0.8fr_auto] md:items-end">
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Nome do divulgador
            <input
              name="nome"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className="min-h-12 rounded-lg border border-slate-200 px-4 font-semibold outline-none focus:border-brasil-green"
              placeholder="Ex: Erick"
            />
          </label>
          <label className="grid gap-2 text-sm font-black text-brasil-navy">
            Código do link/ref
            <input
              name="codigo"
              required
              value={codigo}
              onChange={(event) => setCodigo(normalizeCode(event.target.value))}
              className="min-h-12 rounded-lg border border-slate-200 px-4 font-semibold outline-none focus:border-brasil-green"
              placeholder="ex: erick"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brasil-green px-5 font-black text-white shadow-field disabled:opacity-60"
          >
            <Plus size={18} aria-hidden />
            {loading ? "Criando..." : "Gerar link"}
          </button>
        </form>
        {codigo ? (
          <p className="mt-3 flex items-center gap-2 break-all rounded-lg bg-brasil-light p-3 text-sm font-black text-brasil-blue">
            <Link2 size={16} aria-hidden />
            https://bolao-copa-brasil.vercel.app?ref={codigo}
          </p>
        ) : null}
        {message ? <p className="mt-3 rounded-lg bg-brasil-light p-3 text-sm font-bold text-brasil-navy">{message}</p> : null}
      </section>

      <section className="grid gap-3">
        {items.map((affiliate) => (
          <article key={affiliate.id} className="rounded-lg bg-white p-4 shadow-field">
            <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto] lg:items-center">
              <div>
                <p className="text-lg font-black text-brasil-navy">{affiliate.nome}</p>
                <p className="text-sm font-bold text-brasil-green">ref={affiliate.codigo}</p>
              </div>
              <p className="break-all rounded-lg bg-brasil-light p-3 text-sm font-black text-brasil-blue">{affiliate.link}</p>
              <button
                type="button"
                onClick={() => copyLink(affiliate.id, affiliate.link)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-brasil-yellow px-4 text-sm font-black text-brasil-navy"
              >
                <Copy size={17} aria-hidden />
                {copiedId === affiliate.id ? "Copiado!" : "Copiar link"}
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-500">Cadastros</p>
                <p className="text-xl font-black text-brasil-navy">{affiliate.cadastros}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-500">Pagamentos pagos</p>
                <p className="text-xl font-black text-brasil-navy">{affiliate.pagamentosPagos}</p>
              </div>
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-xs font-bold text-slate-500">Valor pago</p>
                <p className="text-xl font-black text-brasil-green">{currency(affiliate.valorPago)}</p>
              </div>
            </div>
          </article>
        ))}
        {items.length === 0 ? (
          <div className="rounded-lg bg-white p-5 font-semibold text-slate-600 shadow-field">
            Nenhum afiliado cadastrado ainda.
          </div>
        ) : null}
      </section>
    </div>
  );
}

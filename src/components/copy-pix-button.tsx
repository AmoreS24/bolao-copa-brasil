"use client";

import { useState } from "react";
import { Copy } from "lucide-react";

export function CopyPixButton({ payload }: { payload: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!payload) {
      return;
    }

    await navigator.clipboard.writeText(payload);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={!payload}
      className="grid h-10 min-w-10 shrink-0 place-items-center rounded-full bg-brasil-yellow px-3 text-xs font-black text-brasil-blue disabled:opacity-50"
      aria-label="Copiar Pix copia e cola"
    >
      {copied ? "Copiado!" : <Copy size={18} aria-hidden />}
    </button>
  );
}

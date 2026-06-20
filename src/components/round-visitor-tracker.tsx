"use client";

import { useEffect } from "react";

export function RoundVisitorTracker({ gameId }: { gameId: string }) {
  useEffect(() => {
    if (!gameId) {
      return;
    }

    const storageKey = "bolao_visitante_id";
    let visitorId = window.localStorage.getItem(storageKey);

    if (!visitorId) {
      visitorId = window.crypto.randomUUID();
      window.localStorage.setItem(storageKey, visitorId);
    }

    void fetch("/api/visitas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jogo_id: gameId, visitante_id: visitorId })
    });
  }, [gameId]);

  return null;
}

"use client";

import { useEffect } from "react";

const ALLOWED_REFS = new Set(["erick", "luana", "reis", "wallison", "donarosa", "alta-news"]);
const REF_COOKIE = "origem_ref";

function saveReferral(ref: string) {
  window.localStorage.setItem(REF_COOKIE, ref);
  document.cookie = `${REF_COOKIE}=${encodeURIComponent(ref)}; path=/; max-age=2592000; samesite=lax`;
}

export function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toLowerCase();

    if (ref && ALLOWED_REFS.has(ref)) {
      saveReferral(ref);
    }
  }, []);

  return null;
}

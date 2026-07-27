"use client";

import { useEffect, useState } from "react";

export type TokenExpiryStatus = "valid" | "expiring" | "expired";

const EXPIRING_SOON_WINDOW_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;

function decodeExpiresAt(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function useTokenExpiry(token: string | null): TokenExpiryStatus {
  const [status, setStatus] = useState<TokenExpiryStatus>("valid");

  useEffect(() => {
    if (!token) {
      setStatus("valid");
      return;
    }

    const expiresAt = decodeExpiresAt(token);
    if (!expiresAt) {
      setStatus("valid");
      return;
    }

    function check() {
      const msLeft = expiresAt! - Date.now();
      if (msLeft <= 0) setStatus("expired");
      else if (msLeft <= EXPIRING_SOON_WINDOW_MS) setStatus("expiring");
      else setStatus("valid");
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  return status;
}

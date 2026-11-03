export type PaymentEnvironment = Record<string, string | undefined>;

export function allowedOrigins(env: PaymentEnvironment) {
  const allowed = new Set<string>();
  for (const value of (env.PAYMENT_ALLOWED_ORIGINS || "").split(",")) {
    const candidate = value.trim();
    if (!candidate) continue;
    try {
      const url = new URL(candidate);
      const localHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if ((url.protocol !== "https:" && !localHttp) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) continue;
      allowed.add(url.origin);
    } catch { /* Invalid entries fail closed. */ }
  }
  return allowed;
}

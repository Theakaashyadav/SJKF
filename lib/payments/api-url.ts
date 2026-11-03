export type PaymentApiAction = "config" | "order" | "verify";

export function paymentApiBase(value: string): string | null {
  const input = value.trim();
  if (!input || /[\u0000-\u001f\u007f]/.test(value) || input.includes("?") || input.includes("#")) return null;
  try {
    const url = new URL(input);
    const localDevelopment = url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    if ((url.protocol !== "https:" && !localDevelopment) || url.username || url.password || url.pathname !== "/") return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function paymentApiEndpoint(value: string, action: PaymentApiAction): string | null {
  const base = paymentApiBase(value);
  if (!base || !["config", "order", "verify"].includes(action)) return null;
  return `${base}/api/payments/${action}/`;
}

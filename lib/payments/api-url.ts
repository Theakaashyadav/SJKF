export type PaymentApiAction = "config" | "order" | "verify";

export function paymentApiBase(value: string): string | null {
  const input = value.trim();
  if (!input || /[\u0000-\u001f\u007f]/.test(value) || input.includes("?") || input.includes("#")) return null;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.host !== "script.google.com" || url.username || url.password) return null;
    // Only production web app deployments work for anonymous website visitors.
    if (!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec\/?$/.test(url.pathname)) return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function paymentApiEndpoint(value: string, action: PaymentApiAction): string | null {
  const base = paymentApiBase(value);
  if (!base || !["config", "order", "verify"].includes(action)) return null;
  return `${base}?action=${action}`;
}

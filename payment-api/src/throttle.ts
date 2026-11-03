import { isIP } from "node:net";

type Action = "order" | "verify";
type Window = { count: number; expiresAt: number };
type Options = { now?: () => number; maxEntries?: number; state?: Map<string, Window> };

const windowMs = 60_000;
const perClient = { order: 10, verify: 30 };
const perProcess = { order: 120, verify: 600 };

function clientAddress(request: Request) {
  // Proxy headers are a best-effort hint, not an authenticated client identity.
  // The independent process-wide limit still applies if a caller rotates hints.
  const candidates = [request.headers.get("x-real-ip"), request.headers.get("x-forwarded-for")?.split(",")[0].trim()];
  return candidates.find((value) => value && value.length <= 64 && isIP(value)) || "unknown";
}

function denied(expiresAt: number, now: number) {
  return Response.json({ error: "PAYMENT_RATE_LIMITED", message: "Too many payment requests. Please wait a moment and try again." }, {
    status: 429,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Retry-After": String(Math.max(1, Math.ceil((expiresAt - now) / 1000))),
    },
  });
}

export function createPaymentThrottle(options: Options = {}) {
  const clients = options.state ?? new Map<string, Window>();
  const globals = new Map<Action, Window>();
  const maximumEntries = Math.min(4096, Math.max(1, options.maxEntries ?? 2048));
  const clock = options.now ?? Date.now;

  return (request: Request, action: Action): Response | null => {
    const now = clock();
    for (const [key, bucket] of clients) {
      if (bucket.expiresAt <= now) clients.delete(key);
    }
    let globalWindow = globals.get(action);
    if (!globalWindow || globalWindow.expiresAt <= now) {
      globalWindow = { count: 0, expiresAt: now + windowMs };
      globals.set(action, globalWindow);
    }
    if (globalWindow.count >= perProcess[action]) return denied(globalWindow.expiresAt, now);

    const key = `${action}:${clientAddress(request)}`;
    let clientWindow = clients.get(key);
    if (!clientWindow) {
      if (clients.size >= maximumEntries) {
        let earliestExpiry = now + windowMs;
        for (const bucket of clients.values()) earliestExpiry = Math.min(earliestExpiry, bucket.expiresAt);
        return denied(earliestExpiry, now);
      }
      clientWindow = { count: 0, expiresAt: now + windowMs };
      clients.set(key, clientWindow);
    }
    if (clientWindow.count >= perClient[action]) return denied(clientWindow.expiresAt, now);
    clientWindow.count++;
    globalWindow.count++;
    return null;
  };
}

// This guard is bounded per running Node process. Hosting/CDN controls can provide
// broader protection across instances; no distributed protection is implied here.
export const paymentThrottle = createPaymentThrottle();

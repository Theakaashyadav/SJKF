import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { allowedOrigins } from "./origins.ts";
import { handleConfigRequest, handleOrderRequest, handleVerifyRequest, type Dependencies } from "./razorpay.ts";
import { createPaymentThrottle } from "./throttle.ts";

const maximumBodyBytes = 4096;
const apiPaths = new Set(["/api/payments/config", "/api/payments/order", "/api/payments/verify"]);

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

async function send(response: ServerResponse, value: Response, origin: string | null) {
  if (response.destroyed || response.writableEnded) return;
  for (const [name, content] of value.headers) response.setHeader(name, content);
  response.setHeader("Vary", "Origin");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (origin) response.setHeader("Access-Control-Allow-Origin", origin);
  response.statusCode = value.status;
  response.end(Buffer.from(await value.arrayBuffer()));
}

function incomingHeaders(request: IncomingMessage) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }
  if (!headers.has("x-real-ip") && request.socket.remoteAddress) headers.set("x-real-ip", request.socket.remoteAddress);
  return headers;
}

function readBody(request: IncomingMessage) {
  const declaredLength = request.headers["content-length"];
  if (declaredLength && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > maximumBodyBytes)) {
    request.resume();
    throw new HttpError(413, "PAYMENT_REQUEST_TOO_LARGE", "Payment request is too large.");
  }
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    function cleanup() {
      request.off("data", onData);
      request.off("end", onEnd);
      request.off("error", onError);
      request.off("aborted", onAborted);
      request.off("timeout", onTimeout);
      request.setTimeout(0);
    }
    function onData(chunk: Buffer) {
      size += chunk.byteLength;
      if (size > maximumBodyBytes) {
        cleanup();
        request.resume();
        reject(new HttpError(413, "PAYMENT_REQUEST_TOO_LARGE", "Payment request is too large."));
        return;
      }
      chunks.push(chunk);
    }
    function onEnd() { cleanup(); resolve(Buffer.concat(chunks)); }
    function onError() { cleanup(); reject(new HttpError(400, "INVALID_PAYMENT_REQUEST", "Payment request could not be read.")); }
    function onAborted() { cleanup(); reject(new HttpError(400, "INVALID_PAYMENT_REQUEST", "Payment request was interrupted.")); }
    function onTimeout() { cleanup(); request.resume(); reject(new HttpError(408, "PAYMENT_REQUEST_TIMEOUT", "Payment request timed out.")); }
    request.on("data", onData);
    request.on("end", onEnd);
    request.on("error", onError);
    request.on("aborted", onAborted);
    request.on("timeout", onTimeout);
    request.setTimeout(10000);
  });
}

export function createPaymentServer(dependencies: Dependencies = {}) {
  const env = dependencies.env ?? process.env;
  const origins = allowedOrigins(env);
  const throttle = createPaymentThrottle({ now: dependencies.now });
  const server = createServer(async (incoming, response) => {
    let corsOrigin: string | null = null;
    try {
      const path = new URL(incoming.url || "/", "http://payment-api.internal").pathname.replace(/\/+$/, "") || "/";
      if (path === "/health" && (incoming.method === "GET" || incoming.method === "HEAD")) {
        incoming.resume();
        await send(response, json({ ok: true }), null);
        return;
      }
      const headers = incomingHeaders(incoming);
      const origin = headers.get("origin");
      if (origin && !origins.has(origin)) {
        incoming.resume();
        await send(response, json({ error: "PAYMENT_ORIGIN_REJECTED", message: "Open the donation form on the approved website to continue." }, 403), null);
        return;
      }
      corsOrigin = origin;
      if (!apiPaths.has(path)) {
        incoming.resume();
        await send(response, json({ error: "NOT_FOUND", message: "Endpoint not found." }, 404), corsOrigin);
        return;
      }
      if (incoming.method === "OPTIONS") {
        incoming.resume();
        if (!origin) {
          await send(response, json({ error: "PAYMENT_ORIGIN_REJECTED", message: "An approved website origin is required." }, 403), null);
          return;
        }
        const requestedMethod = headers.get("access-control-request-method");
        const requestedHeaders = (headers.get("access-control-request-headers") || "").split(",").map((name) => name.trim().toLowerCase()).filter(Boolean);
        if (!["GET", "POST"].includes(requestedMethod || "") || requestedHeaders.some((name) => name !== "content-type")) {
          await send(response, json({ error: "PREFLIGHT_REJECTED", message: "This browser request is not permitted." }, 403), corsOrigin);
          return;
        }
        await send(response, new Response(null, { status: 204, headers: {
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "600",
        } }), corsOrigin);
        return;
      }
      if (path === "/api/payments/config" && incoming.method === "GET") {
        incoming.resume();
        await send(response, handleConfigRequest({ ...dependencies, env }), corsOrigin);
        return;
      }
      if ((path !== "/api/payments/order" && path !== "/api/payments/verify") || incoming.method !== "POST") {
        incoming.resume();
        const result = json({ error: "METHOD_NOT_ALLOWED", message: "This HTTP method is not supported." }, 405);
        result.headers.set("Allow", path === "/api/payments/config" ? "GET, OPTIONS" : "POST, OPTIONS");
        await send(response, result, corsOrigin);
        return;
      }
      if (!origin) {
        incoming.resume();
        await send(response, json({ error: "PAYMENT_ORIGIN_REJECTED", message: "An approved website origin is required." }, 403), null);
        return;
      }
      const probe = new Request(`http://payment-api.internal${path}`, { method: "POST", headers });
      const limited = throttle(probe, path.endsWith("/order") ? "order" : "verify");
      if (limited) {
        incoming.resume();
        await send(response, limited, corsOrigin);
        return;
      }
      const body = await readBody(incoming);
      const request = new Request(`http://payment-api.internal${path}`, { method: "POST", headers, body: new Uint8Array(body) });
      const result = path.endsWith("/order")
        ? await handleOrderRequest(request, { ...dependencies, env })
        : await handleVerifyRequest(request, { ...dependencies, env });
      await send(response, result, corsOrigin);
    } catch (error) {
      const result = error instanceof HttpError
        ? json({ error: error.code, message: error.message }, error.status)
        : json({ error: "PAYMENT_SERVICE_UNAVAILABLE", message: "Payment service is temporarily unavailable. Please try again." }, 500);
      await send(response, result, corsOrigin).catch(() => response.destroy());
    }
  });
  server.headersTimeout = 10000;
  server.requestTimeout = 15000;
  server.keepAliveTimeout = 5000;
  server.setTimeout(30000, (socket) => socket.destroy());
  return server;
}

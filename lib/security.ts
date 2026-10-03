import { NextRequest, NextResponse } from "next/server";

export function clientIp(request: NextRequest) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export function originIsAllowed(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const configured = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : null;
    return originUrl.origin === requestUrl.origin || originUrl.origin === configured?.origin;
  } catch {
    return false;
  }
}

export function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().replace(/[<>]/g, "").slice(0, max) : "";
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
}

export function isIndianMobile(value: string) {
  return /^[\d+()\s-]+$/.test(value) && /^[6-9]\d{9}$/.test(normalizePhone(value));
}

export function jsonError(message: string, status = 400, headers?: HeadersInit) {
  return NextResponse.json({ ok: false, message }, { status, headers });
}

export function looksHuman(startedAt: unknown, honeypot: unknown) {
  if (typeof honeypot === "string" && honeypot.trim()) return false;
  if (typeof startedAt !== "number") return false;
  const elapsed = Date.now() - startedAt;
  return elapsed >= 1500 && elapsed <= 1000 * 60 * 60 * 4;
}

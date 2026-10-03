import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type ReceiptData = {
  paymentId: string;
  orderId: string;
  donorName: string;
  amount: number;
  cause: string;
  donatedAt: string;
  expiresAt: number;
};

function receiptKey() {
  const secret = process.env.PAYMENT_RECEIPT_SECRET;
  if (!secret) throw new Error("Receipt secret is not configured");
  return createHash("sha256").update(secret).digest();
}

export function createReceiptToken(data: Omit<ReceiptData, "expiresAt">) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", receiptKey(), iv);
  const payload = Buffer.from(JSON.stringify({ ...data, expiresAt: Date.now() + 1000 * 60 * 60 * 24 }));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

export function readReceiptToken(token: string): ReceiptData | null {
  try {
    const buffer = Buffer.from(token, "base64url");
    if (buffer.length < 29) return null;
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", receiptKey(), iv);
    decipher.setAuthTag(tag);
    const parsed = JSON.parse(Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8")) as ReceiptData;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

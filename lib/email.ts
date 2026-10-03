import { organization, SITE_URL } from "@/lib/site";

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character] || character);
}

async function sendEmail({ to, subject, html, replyTo, idempotencyKey }: { to: string; subject: string; html: string; replyTo?: string; idempotencyKey?: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RECEIPT_FROM_EMAIL;
  if (!apiKey || !from || !to) return { sent: false, reason: "unconfigured" as const };

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
    cache: "no-store",
  });
  return { sent: response.ok, reason: response.ok ? "sent" as const : "provider_error" as const };
}

export function receiptEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RECEIPT_FROM_EMAIL);
}

export async function sendDonationReceipt(data: { donorName: string; email: string; amount: number; cause: string; paymentId: string; donatedAt: string }) {
  return sendEmail({
    to: data.email,
    idempotencyKey: `donation-receipt/${data.paymentId}`,
    subject: `Donation acknowledgement · ${data.paymentId}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#18211d">
        <div style="background:#0f4c3a;color:#fff;padding:28px"><table role="presentation" style="border-collapse:collapse"><tr><td style="padding-right:14px"><img src="${SITE_URL}/favicon.svg" width="48" height="48" alt="Swabhiman Foundation logo" style="display:block;border-radius:12px;background:#ffffff"/></td><td><div style="font-size:20px;font-weight:700">${organization.name}</div><div style="color:#dfaf45;margin-top:8px">Donation acknowledgement</div></td></tr></table></div>
        <div style="padding:28px;border:1px solid #dfe6e2;border-top:0">
          <p>Dear ${escapeHtml(data.donorName)},</p>
          <p>Thank you for supporting compassionate action for people, animals and communities.</p>
          <table style="width:100%;border-collapse:collapse;margin:24px 0">
            <tr><td style="padding:10px;border-bottom:1px solid #dfe6e2">Donation amount</td><td style="padding:10px;border-bottom:1px solid #dfe6e2;text-align:right"><strong>₹${data.amount.toLocaleString("en-IN")}</strong></td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #dfe6e2">Donation date</td><td style="padding:10px;border-bottom:1px solid #dfe6e2;text-align:right">${escapeHtml(data.donatedAt)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #dfe6e2">Transaction ID</td><td style="padding:10px;border-bottom:1px solid #dfe6e2;text-align:right">${escapeHtml(data.paymentId)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #dfe6e2">Cause</td><td style="padding:10px;border-bottom:1px solid #dfe6e2;text-align:right">${escapeHtml(data.cause)}</td></tr>
            <tr><td style="padding:10px;border-bottom:1px solid #dfe6e2">Donor name</td><td style="padding:10px;border-bottom:1px solid #dfe6e2;text-align:right">${escapeHtml(data.donorName)}</td></tr>
          </table>
          <p style="font-size:13px;color:#66736d"><strong>Registered office:</strong> ${organization.addressLines.join(", ")}<br/><strong>CIN:</strong> ${organization.cin}</p>
          <p style="font-size:12px;color:#66736d;background:#fafaf6;padding:12px">This acknowledgement does not represent an 80G tax-exemption certificate. No tax benefit is claimed unless a valid applicable approval is separately confirmed.</p>
        </div>
      </div>`,
  });
}

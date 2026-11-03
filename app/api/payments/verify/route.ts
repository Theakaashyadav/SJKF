import { handleVerifyRequest } from "@/lib/payments/razorpay";
import { paymentThrottle } from "@/lib/payments/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = paymentThrottle(request, "verify");
  if (limited) return limited;
  return handleVerifyRequest(request);
}

import { handleOrderRequest } from "@/lib/payments/razorpay";
import { paymentThrottle } from "@/lib/payments/throttle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = paymentThrottle(request, "order");
  if (limited) return limited;
  return handleOrderRequest(request);
}

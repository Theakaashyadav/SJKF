import { handleConfigRequest } from "@/lib/payments/razorpay";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return handleConfigRequest();
}

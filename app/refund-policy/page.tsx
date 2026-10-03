import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/components/PolicyPage";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Refund / Cancellation Policy | Swabhiman Foundation", "How duplicate, erroneous or unauthorized donation concerns are reviewed.", "/refund-policy");

const sections: PolicySection[] = [
  { id: "general", title: "1. General position", content: <p>Donations are voluntary and generally final after successful payment verification because funds may be committed toward charitable activities and administrative processing begins promptly. There is no cancellation of a completed donation in the same way as a retail purchase.</p> },
  { id: "eligible", title: "2. Situations considered for review", content: <><p>We may review a request involving:</p><ul><li>An accidental duplicate transaction.</li><li>An incorrect amount caused by a clear input or processing error.</li><li>A transaction reported as unauthorized by the payment instrument holder.</li><li>A payment shown as completed by the donor but not verifiable in the foundation’s gateway records.</li></ul><p>A request is not automatically approved merely because it has been submitted.</p></> },
  { id: "request", title: "3. How to request a review", content: <p>Contact the foundation as soon as reasonably possible, preferably within seven calendar days of the transaction. Include the donor name, payment or order reference, date, amount, contact email and a clear explanation. Do not send complete card details, CVV, OTP, UPI PIN or banking password.</p> },
  { id: "verification", title: "4. Verification", content: <p>We may ask for limited evidence needed to locate and verify the transaction. Unauthorized-payment claims may also need to be raised directly with the bank, card issuer, UPI provider or payment gateway under their dispute procedures.</p> },
  { id: "decision", title: "5. Decision and processing", content: <p>Approved refunds are normally returned through the original payment method, subject to gateway and banking processes. Processing time after approval depends on the payment provider and recipient bank. We will not request credentials to “speed up” a refund.</p> },
  { id: "fees", title: "6. Charges and amount", content: <p>Where legally permissible, the refunded amount may reflect non-recoverable payment-provider charges or amounts already lawfully committed, but any adjustment will be explained before processing. Nothing in this policy limits rights that cannot be excluded under applicable law.</p> },
  { id: "failed", title: "7. Failed or pending payments", content: <p>If a payment fails or remains pending, banks and payment networks may automatically release or reverse the amount. Please allow the time stated by your bank or gateway. Contact us with the payment reference if the debit remains unresolved after that period.</p> },
];

export default function RefundPolicyPage() { return <PolicyPage title="Refund / Cancellation Policy" summary="A transparent process for reviewing duplicate, erroneous, pending or unauthorized donation concerns." sections={sections} />; }

import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/components/PolicyPage";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Donation Policy | Swabhiman Foundation", "Important information about online contributions to Swabhiman Foundation.", "/donation-policy");

const sections: PolicySection[] = [
  { id: "purpose", title: "1. Purpose of donations", content: <p>Donations support the charitable objects of Swabhiman Jan Evam Pashu Kalyan Foundation across animal welfare, education, healthcare, environmental initiatives, community welfare and related public-benefit activities permitted by its governing documents and applicable law.</p> },
  { id: "voluntary", title: "2. Voluntary contributions", content: <p>Every contribution is voluntary. Donors should give only from funds they are authorized to use and only after reviewing the amount, cause and donor information shown before checkout.</p> },
  { id: "cause", title: "3. Cause selection and allocation", content: <p>We will make reasonable efforts to apply cause-designated support toward that area. Where a designated activity cannot be undertaken responsibly, lawfully or within a reasonable period, the foundation may apply the contribution to a closely related charitable objective or an area of need consistent with its registered objects.</p> },
  { id: "processing", title: "4. Secure payment processing", content: <p>Payments are completed through Razorpay’s hosted Donations Payment Button. Razorpay processes the payment and reports its status under its own terms and security controls. This static website does not collect or store complete card numbers, CVV, UPI PIN, net-banking passwords or OTPs.</p> },
  { id: "accuracy", title: "5. Donor information", content: <p>Donors are responsible for providing accurate contact and receipt information in the hosted checkout. PAN should be provided only when the payment provider requests it for an applicable record or receipt requirement. Please do not provide Aadhaar or unrelated identity documents.</p> },
  { id: "acknowledgement", title: "6. Acknowledgements", content: <p>Razorpay may display a confirmation and send a payment receipt after a successful transaction when those options are enabled. The foundation reconciles contributions against the transaction records available through the payment provider.</p> },
  { id: "tax", title: "7. Tax treatment", content: <p>A payment acknowledgement is not automatically a tax-exemption certificate. The foundation does not promise or advertise an 80G deduction unless a valid, applicable approval has been obtained, verified and separately communicated. Donors should seek independent tax advice for their circumstances.</p> },
  { id: "fraud", title: "8. Fraud prevention", content: <p>We may hold, reject or refer a transaction for additional review where required by the payment provider, law or reasonable anti-fraud controls. Never share an OTP, CVV, card PIN or banking password with a person claiming to represent the foundation.</p> },
  { id: "refunds", title: "9. Refunds", content: <p>Donations are generally final once successfully processed. Limited requests involving duplicates, processing errors or unauthorized use are considered under the Refund / Cancellation Policy and applicable payment-network rules.</p> },
];

export default function DonationPolicyPage() { return <PolicyPage title="Donation Policy" summary="How voluntary contributions are selected, processed, acknowledged and used responsibly." sections={sections} />; }

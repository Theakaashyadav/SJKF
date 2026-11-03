import { T } from "@/components/LanguageProvider";
import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/components/PolicyPage";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Donation Policy | Swabhiman Foundation", "Important information about online contributions to Swabhiman Foundation.", "/donation-policy");

const sections: PolicySection[] = [
  { id: "purpose", title: "1. Purpose of donations", content: <p><T>{"Donations support the charitable objects of Swabhiman Jan Evam Pashu Kalyan Foundation across animal welfare, education, healthcare, environmental initiatives, community welfare and related public-benefit activities permitted by its governing documents and applicable law."}</T></p> },
  { id: "voluntary", title: "2. Voluntary contributions", content: <p><T>{"Every contribution is voluntary. Donors should give only from funds they are authorized to use and only after reviewing the amount, cause and donor information shown before checkout."}</T></p> },
  { id: "cause", title: "3. Cause selection and allocation", content: <p><T>{"We will make reasonable efforts to apply cause-designated support toward that area. Where a designated activity cannot be undertaken responsibly, lawfully or within a reasonable period, the foundation may apply the contribution to a closely related charitable objective or an area of need consistent with its registered objects."}</T></p> },
  { id: "processing", title: "4. Secure payment processing", content: <p><T>{"Online payments are completed through Razorpay Standard Checkout. Our payment service creates the order and verifies the payment signature, amount and provider records before displaying a confirmed contribution. Authorized or pending payments are not confirmed. This website does not collect or store complete card numbers, CVV, UPI PIN, net-banking passwords or OTPs."}</T></p> },
  { id: "accuracy", title: "5. Donor information", content: <p><T>{"Donors are responsible for providing accurate contact and receipt information in Razorpay Checkout. PAN should be provided only when the payment provider requests it for an applicable record or receipt requirement. Please do not provide Aadhaar or unrelated identity documents."}</T></p> },
  { id: "acknowledgement", title: "6. Acknowledgements", content: <p><T>{"Confirmation is displayed in the donation form only after the payment service verifies a captured Razorpay payment. Direct UPI and bank transfers require manual reconciliation. This website does not automatically email a payment receipt or donation acknowledgement. Keep your transaction reference and contact the foundation to request an acknowledgement."}</T></p> },
  { id: "tax", title: "7. Tax treatment", content: <p><T>{"A payment acknowledgement is not automatically a tax-exemption certificate. The foundation does not promise or advertise an 80G deduction unless a valid, applicable approval has been obtained, verified and separately communicated. Donors should seek independent tax advice for their circumstances."}</T></p> },
  { id: "fraud", title: "8. Fraud prevention", content: <p><T>{"We may hold, reject or refer a transaction for additional review where required by the payment provider, law or reasonable anti-fraud controls. Never share an OTP, CVV, card PIN or banking password with a person claiming to represent the foundation."}</T></p> },
  { id: "refunds", title: "9. Refunds", content: <p><T>{"Donations are generally final once successfully processed. Limited requests involving duplicates, processing errors or unauthorized use are considered under the Refund / Cancellation Policy and applicable payment-network rules."}</T></p> },
];

export default function DonationPolicyPage() { return <PolicyPage title="Donation Policy" summary="How voluntary contributions are selected, processed, acknowledged and used responsibly." sections={sections} updated="3 November 2026" />; }

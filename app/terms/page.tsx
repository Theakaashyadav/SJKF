import type { Metadata } from "next";
import { PolicyPage, type PolicySection } from "@/components/PolicyPage";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("Terms & Conditions | Swabhiman Foundation", "Terms governing use of the Swabhiman Foundation website and online services.", "/terms");

const sections: PolicySection[] = [
  { id: "acceptance", title: "1. Acceptance of terms", content: <p>By using this website, you agree to these terms and the policies linked from it. If you do not agree, please do not use the website or submit information through its forms.</p> },
  { id: "information", title: "2. Website information", content: <p>The website describes the foundation’s identity, objectives and intended areas of work. Unless a project is supported by verified details, wording such as “we aim to” or “our initiatives focus on” describes purpose rather than a completed achievement. We make reasonable efforts to keep information accurate but may correct or update it without notice.</p> },
  { id: "use", title: "3. Acceptable use", content: <><p>You must not:</p><ul><li>Use the website for unlawful, deceptive or abusive activity.</li><li>Attempt to bypass security, access non-public systems or interfere with normal operation.</li><li>Submit malicious code, false payment information or automated spam.</li><li>Misrepresent an affiliation with the foundation.</li><li>Copy protected content in a way that violates applicable intellectual-property rights.</li></ul></> },
  { id: "donations", title: "4. Donations", content: <p>Online donations are voluntary and processed through a third-party hosted gateway. A donation is confirmed only after successful server-side payment verification. Donors must provide accurate information and should review the Donation Policy and Refund / Cancellation Policy before payment.</p> },
  { id: "intellectual-property", title: "5. Content and intellectual property", content: <p>The foundation’s name, original website text, visual identity and other owned material may not be used to imply endorsement or authorization. Third-party photographs and trademarks remain subject to their respective rights and licences.</p> },
  { id: "third-parties", title: "6. Third-party services", content: <p>Links or embedded services may lead to payment, map, social or other third-party platforms. Those services operate under their own terms and policies. A link does not automatically mean the foundation endorses all content on the external service.</p> },
  { id: "liability", title: "7. Availability and limitation", content: <p>We aim to keep the website reliable and secure, but availability may be interrupted by maintenance, network failures or circumstances outside our control. To the extent permitted by applicable law, the website is provided for general information without a guarantee that every feature will always be uninterrupted or error-free.</p> },
  { id: "law", title: "8. Governing law", content: <p>These terms are governed by the laws of India. Subject to applicable law, disputes relating to the website will fall within the competent jurisdiction associated with the foundation’s registered office in Uttar Pradesh.</p> },
  { id: "changes", title: "9. Changes", content: <p>We may update these terms when website functions, operational practices or legal requirements change. Continued use after publication means the updated terms apply from their stated effective date.</p> },
];

export default function TermsPage() { return <PolicyPage title="Terms & Conditions" summary="The conditions that support fair, safe and responsible use of this website." sections={sections} />; }

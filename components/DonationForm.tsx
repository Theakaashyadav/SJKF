"use client";

import Script from "next/script";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useRef, useState } from "react";
import { Check, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { causeOptions } from "@/lib/site";

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => Promise<void>;
};

type RazorpayInstance = { open: () => void; on: (event: string, callback: (response: { error?: { description?: string } }) => void) => void };

const amounts = [500, 1000, 2500, 5000, 10000];

function normalizeCause(query: string | null) {
  if (!query) return "General Donation";
  if (query.includes("Education")) return "Education";
  if (query.includes("Environment")) return "Environmental Initiatives";
  if (query.includes("Community") || query.includes("Youth") || query.includes("Women") || query.includes("Disaster")) return "Community Welfare";
  if (query.includes("Healthcare")) return "Healthcare";
  if (query.includes("Animal")) return "Animal Welfare";
  return "General Donation";
}

export function DonationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCause = useMemo(() => normalizeCause(searchParams.get("cause")), [searchParams]);
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [cause, setCause] = useState(initialCause);
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "info"; message: string } | null>(null);
  const startedAt = useRef(Date.now());
  const collectPan = process.env.NEXT_PUBLIC_DONATION_PAN_ENABLED === "true";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const amount = selectedAmount === "custom" ? Number(customAmount) : selectedAmount;
    if (!Number.isInteger(amount) || amount < 100 || amount > 500000) {
      setFeedback({ type: "error", message: "Please choose an amount between ₹100 and ₹5,00,000." });
      return;
    }
    if (!scriptReady || !window.Razorpay) {
      setFeedback({ type: "error", message: "Secure checkout is still loading. Please wait a moment and try again." });
      return;
    }

    const payload = {
      fullName: String(data.get("fullName") || ""),
      email: String(data.get("email") || ""),
      mobile: String(data.get("mobile") || ""),
      pan: String(data.get("pan") || ""),
      address: String(data.get("address") || ""),
      message: String(data.get("message") || ""),
      website: String(data.get("website") || ""),
      amount,
      cause,
      agreed: data.get("agreed") === "on",
      startedAt: startedAt.current,
    };

    setLoading(true);
    try {
      const orderResponse = await fetch("/api/donations/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const order = await orderResponse.json();
      if (!orderResponse.ok) throw new Error(order.message || "Secure payment could not be started.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: order.organizationName,
        description: order.description,
        order_id: order.orderId,
        prefill: { name: payload.fullName, email: payload.email, contact: payload.mobile },
        theme: { color: "#0F4C3A" },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setFeedback({ type: "info", message: "Checkout was closed. No new payment was made." });
          },
        },
        handler: async (response) => {
          setFeedback({ type: "info", message: "Payment received. Verifying the secure signature…" });
          try {
            let verified: { redirect?: string; message?: string; pending?: boolean } = {};
            for (let attempt = 0; attempt < 6; attempt += 1) {
              const verifyResponse = await fetch("/api/donations/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(response),
              });
              verified = await verifyResponse.json();
              if (verifyResponse.ok && verified.redirect) break;
              if (verifyResponse.status !== 409 || !verified.pending || attempt === 5) throw new Error(verified.message || "Payment verification failed.");
              await new Promise((resolve) => window.setTimeout(resolve, 2000));
            }
            if (!verified.redirect) throw new Error("Payment capture is still pending.");
            router.push(verified.redirect);
          } catch (error) {
            sessionStorage.setItem("payment-help", response.razorpay_payment_id);
            router.push("/payment-failed?status=verification");
          }
        },
      });

      checkout.on("payment.failed", (response) => {
        setLoading(false);
        const reason = response.error?.description || "The payment was not completed.";
        sessionStorage.setItem("payment-error", reason);
        router.push("/payment-failed?status=failed");
      });
      checkout.open();
    } catch (error) {
      setLoading(false);
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "We could not start secure checkout. Please try again." });
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} onError={() => setFeedback({ type: "error", message: "Secure checkout could not load. Please check your connection and try again." })} />
      <form className="donation-form" onSubmit={handleSubmit} noValidate>
        <div className="form-section">
          <div className="form-section__heading"><span>1</span><div><h2>Choose your contribution</h2><p>Every amount can help strengthen a responsible initiative.</p></div></div>
          <div className="amount-grid" role="group" aria-label="Donation amount">
            {amounts.map((amount) => <button type="button" key={amount} className={selectedAmount === amount ? "is-selected" : ""} aria-pressed={selectedAmount === amount} onClick={() => setSelectedAmount(amount)}>₹{amount.toLocaleString("en-IN")}</button>)}
            <button type="button" className={selectedAmount === "custom" ? "is-selected" : ""} aria-pressed={selectedAmount === "custom"} onClick={() => setSelectedAmount("custom")}>Custom amount</button>
          </div>
          {selectedAmount === "custom" ? <label className="field custom-amount"><span>Custom amount (₹) <b>*</b></span><input type="number" inputMode="numeric" min="100" max="500000" step="1" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} required placeholder="Enter an amount" /></label> : null}
          <label className="field"><span>Choose a cause <b>*</b></span><select name="cause" value={cause} onChange={(event) => setCause(event.target.value)} required>{causeOptions.map((option) => <option key={option}>{option}</option>)}</select></label>
        </div>

        <div className="form-section">
          <div className="form-section__heading"><span>2</span><div><h2>Your details</h2><p>Used for payment verification and your donation acknowledgement.</p></div></div>
          <div className="form-grid">
            <label className="field"><span>Full name <b>*</b></span><input name="fullName" type="text" autoComplete="name" minLength={2} maxLength={100} required /></label>
            <label className="field"><span>Email address <b>*</b></span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
            <label className="field"><span>Mobile number <b>*</b></span><input name="mobile" type="tel" autoComplete="tel" inputMode="tel" pattern="(?:\+?91[ -]?)?[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" required /></label>
            {collectPan ? <label className="field"><span>PAN <small>Optional · only for an applicable receipt requirement</small></span><input name="pan" type="text" autoComplete="off" maxLength={10} pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="Enter a valid PAN or leave blank" /></label> : null}
            <label className="field field--wide"><span>Address <small>Optional</small></span><textarea name="address" rows={2} maxLength={240} autoComplete="street-address" /></label>
            <label className="field field--wide"><span>Message <small>Optional</small></span><textarea name="message" rows={3} maxLength={240} placeholder="A short note to the foundation" /></label>
            <label className="honeypot" aria-hidden="true">Website<input name="website" type="text" tabIndex={-1} autoComplete="off" /></label>
          </div>
        </div>

        <label className="policy-consent"><input name="agreed" type="checkbox" required /><span><Check />I agree to the <Link href="/donation-policy" target="_blank">Donation Policy</Link>, <Link href="/terms" target="_blank">Terms</Link> and <Link href="/privacy-policy" target="_blank">Privacy Policy</Link>.</span></label>

        {feedback ? <div className={`form-feedback form-feedback--${feedback.type}`} role="status">{feedback.message}</div> : null}

        <button className="button button--gold button--large submit-payment" type="submit" disabled={loading}>
          {loading ? <><LoaderCircle className="spin" />Please wait</> : <><LockKeyhole />Proceed to secure payment</>}
        </button>
        <div className="payment-assurance"><span><ShieldCheck />Server-verified payment</span><span><CreditCard />Hosted Razorpay checkout</span><span><LockKeyhole />No card details stored here</span></div>
      </form>
    </>
  );
}

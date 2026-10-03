"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";

const amounts = [500, 1000, 2500, 5000, 10000];

type WidgetState = "idle" | "loading" | "ready" | "error";

export function DonationForm() {
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [widgetState, setWidgetState] = useState<WidgetState>("idle");
  const widgetRoot = useRef<HTMLDivElement>(null);
  const paymentButtonId = process.env.NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID?.trim() || "";
  const buttonConfigured = /^pl_[A-Za-z0-9]+$/.test(paymentButtonId);
  const amount = useMemo(
    () => selectedAmount === "custom" ? Number(customAmount) : selectedAmount,
    [customAmount, selectedAmount],
  );
  const amountIsValid = Number.isInteger(amount) && amount >= 100 && amount <= 500000;

  useEffect(() => {
    const root = widgetRoot.current;
    if (!root) return;

    root.replaceChildren();
    if (!buttonConfigured || !amountIsValid) {
      setWidgetState("idle");
      return;
    }

    setWidgetState("loading");
    const form = document.createElement("form");
    form.className = "razorpay-payment-form";
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/payment-button.js";
    script.async = true;
    script.setAttribute("data-payment_button_id", paymentButtonId);
    script.setAttribute("data-button_text", "Donate securely");
    script.setAttribute("data-button_theme", "rzp-dark-standard");
    script.setAttribute("data-prefill.amount.donation_amount", String(amount));
    script.addEventListener("load", () => setWidgetState("ready"));
    script.addEventListener("error", () => setWidgetState("error"));
    form.appendChild(script);
    root.appendChild(form);

    return () => root.replaceChildren();
  }, [amount, amountIsValid, buttonConfigured, paymentButtonId]);

  return (
    <div className="donation-form">
      <div className="form-section">
        <div className="form-section__heading"><span>1</span><div><h2>Choose your contribution</h2><p>Every amount can help strengthen a responsible initiative.</p></div></div>
        <div className="amount-grid" role="group" aria-label="Donation amount">
          {amounts.map((preset) => <button type="button" key={preset} className={selectedAmount === preset ? "is-selected" : ""} aria-pressed={selectedAmount === preset} onClick={() => setSelectedAmount(preset)}>₹{preset.toLocaleString("en-IN")}</button>)}
          <button type="button" className={selectedAmount === "custom" ? "is-selected" : ""} aria-pressed={selectedAmount === "custom"} onClick={() => setSelectedAmount("custom")}>Custom amount</button>
        </div>
        {selectedAmount === "custom" ? <label className="field custom-amount"><span>Custom amount (₹) <b>*</b></span><input type="number" inputMode="numeric" min="100" max="500000" step="1" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} required placeholder="Enter an amount" /></label> : null}
      </div>

      <div className="form-section">
        <div className="form-section__heading"><span>2</span><div><h2>Complete secure checkout</h2><p>Choose your cause and enter donor details only inside Razorpay&apos;s hosted donation form.</p></div></div>

        {!buttonConfigured ? (
          <div className="static-donation-fallback">
            <div className="form-feedback form-feedback--info" role="status">Online donations are being configured. Please contact the foundation for verified contribution details.</div>
            <Link className="button button--green button--large" href="/contact?interest=donation">Contact the foundation</Link>
          </div>
        ) : null}

        {buttonConfigured && selectedAmount === "custom" && !amountIsValid ? <div className="form-feedback form-feedback--error" role="status">Enter a whole amount between ₹100 and ₹5,00,000 to continue.</div> : null}
        {buttonConfigured && amountIsValid && widgetState === "loading" ? <p className="payment-widget-status" role="status">Preparing secure checkout…</p> : null}
        {buttonConfigured && amountIsValid && widgetState === "error" ? <div className="form-feedback form-feedback--error" role="alert">Secure checkout could not load. Please check your connection or contact the foundation.</div> : null}
        <div ref={widgetRoot} className="razorpay-widget" aria-live="polite" />
      </div>

      <p className="policy-consent">By continuing, you agree to the&nbsp;<Link href="/donation-policy" target="_blank">Donation Policy</Link>,&nbsp;<Link href="/terms" target="_blank">Terms</Link>&nbsp;and&nbsp;<Link href="/privacy-policy" target="_blank">Privacy Policy</Link>.</p>
      <div className="payment-assurance"><span><ShieldCheck />Razorpay-hosted checkout</span><span><CreditCard />Payment details handled by Razorpay</span><span><LockKeyhole />No banking credentials stored here</span></div>
    </div>
  );
}

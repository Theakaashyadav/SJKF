"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/LanguageProvider";
import { causeOptions, organization } from "@/lib/site";
import { paymentApiEndpoint, type PaymentApiAction } from "@/lib/payments/api-url";

const amounts = [500, 1000, 2500, 5000, 10000];
type CheckoutResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = {
  key: string; order_id: string; amount: number; currency: "INR"; name: string; description: string;
  image: string; theme: { color: string }; config: { display: { language: "en" | "hi" } };
  handler: (response: CheckoutResponse) => void;
  modal: { ondismiss: () => void; confirm_close: boolean };
  retry: { enabled: boolean };
};
type Checkout = { open: () => void; close: () => void; on: (event: "payment.failed", callback: (response: { error?: { metadata?: { payment_id?: string } } }) => void) => void };
type RazorpayConstructor = new (options: CheckoutOptions) => Checkout;
type Order = { keyId: string; orderId: string; amount: number; currency: "INR"; orderToken: string };
type Verification = { orderId: string; paymentId: string; signature: string; orderToken: string };
type Flow = "idle" | "preparing" | "checkout" | "verifying" | "cancelled" | "failed" | "pending" | "unconfirmed" | "success";
type Availability = "checking" | "missing" | "unconfigured" | "unavailable" | "ready";

declare global { interface Window { Razorpay?: RazorpayConstructor } }

let checkoutLoader: Promise<RazorpayConstructor> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (checkoutLoader) return checkoutLoader;
  checkoutLoader = new Promise<RazorpayConstructor>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    const timeout = window.setTimeout(fail, 15000);
    function fail() {
      window.clearTimeout(timeout);
      script.remove();
      checkoutLoader = null;
      reject(new Error("Checkout unavailable"));
    }
    script.onerror = fail;
    script.onload = () => {
      if (!window.Razorpay) { fail(); return; }
      window.clearTimeout(timeout);
      resolve(window.Razorpay);
    };
    document.head.appendChild(script);
  });
  return checkoutLoader;
}

async function postPayment(base: string, action: PaymentApiAction, body: object) {
  const endpoint = paymentApiEndpoint(base, action);
  if (!endpoint) throw new Error("Payment service is not configured");
  const response = await fetch(endpoint, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    cache: "no-store", signal: AbortSignal.timeout(60000),
  });
  const data = await response.json();
  if (!response.ok || !data || typeof data !== "object") throw new Error("Payment request unavailable");
  return data;
}

export function DonationForm() {
  const { language, t } = useLanguage();
  const searchParams = useSearchParams();
  const requestedCause = searchParams.get("cause");
  const [cause, setCause] = useState<string>(() => causeOptions.find((option) => option === requestedCause) || "General Donation");
  const [selectedAmount, setSelectedAmount] = useState<number | "custom">(1000);
  const [customAmount, setCustomAmount] = useState("");
  const paymentApi = process.env.NEXT_PUBLIC_RAZORPAY_API_URL?.trim() || "";
  const configEndpoint = paymentApiEndpoint(paymentApi, "config");
  const [availability, setAvailability] = useState<Availability>("checking");
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [flow, setFlow] = useState<Flow>("idle");
  const [paymentReference, setPaymentReference] = useState("");
  const [verifiedAmount, setVerifiedAmount] = useState(0);
  const verification = useRef<Verification | null>(null);
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const amount = useMemo(() => selectedAmount === "custom" ? Number(customAmount) : selectedAmount, [customAmount, selectedAmount]);
  const amountIsValid = Number.isInteger(amount) && amount >= 100 && amount <= 500000;
  const busy = ["preparing", "checkout", "verifying"].includes(flow);
  const awaitingConfirmation = flow === "pending" || flow === "unconfirmed";
  const locked = busy || awaitingConfirmation || flow === "success";
  const configured = availability === "ready";

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!configEndpoint) {
      setAvailability("missing");
      return;
    }
    const endpoint = configEndpoint;
    const controller = new AbortController();
    setAvailability("checking");
    async function checkAvailability() {
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(60000)]) });
        if (!response.ok) throw new Error("Payment availability check failed");
        const data = await response.json();
        if (!data || typeof data !== "object" || typeof data.configured !== "boolean") throw new Error("Invalid payment availability response");
        if (!controller.signal.aborted) setAvailability(data.configured ? "ready" : "unconfigured");
      } catch {
        if (!controller.signal.aborted) setAvailability("unavailable");
      }
    }
    void checkAvailability();
    return () => { controller.abort(); };
  }, [configEndpoint, availabilityAttempt]);

  async function verifyPayment(details: Verification) {
    if (!mounted.current) return;
    setFlow("verifying");
    busyRef.current = true;
    try {
      const result = await postPayment(paymentApi, "verify", details);
      if (!mounted.current) return;
      if (result.verified === true && result.status === "captured" && result.orderId === details.orderId && result.paymentId === details.paymentId && result.currency === "INR" && result.amount === amount * 100) {
        setVerifiedAmount(result.amount);
        setFlow("success");
      } else if (result.verified === false && result.status === "pending") {
        setFlow("pending");
      } else {
        setFlow("unconfirmed");
      }
    } catch {
      if (mounted.current) setFlow("unconfirmed");
    } finally {
      busyRef.current = false;
    }
  }

  async function startCheckout() {
    if (busyRef.current || locked || !configured || !amountIsValid) return;
    busyRef.current = true;
    setFlow("preparing");
    setPaymentReference("");
    verification.current = null;
    try {
      const Razorpay = await loadCheckout();
      const order: Order = await postPayment(paymentApi, "order", { amount, cause });
      if (!mounted.current) { busyRef.current = false; return; }
      if (!/^rzp_(?:test|live)_[A-Za-z0-9]+$/.test(order.keyId) || !/^order_[A-Za-z0-9]+$/.test(order.orderId) || order.amount !== amount * 100 || order.currency !== "INR" || typeof order.orderToken !== "string" || !order.orderToken) throw new Error("Invalid checkout order");
      let callbackReceived = false;
      let failed = false;
      const checkout = new Razorpay({
        key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
        name: organization.shortName, description: cause, image: `${window.location.origin}/images/logo.png`,
        theme: { color: "#0f4c3a" }, config: { display: { language } }, retry: { enabled: false },
        handler: (response) => {
          if (callbackReceived) return;
          callbackReceived = true;
          const details = { orderId: order.orderId, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature, orderToken: order.orderToken };
          verification.current = details;
          setPaymentReference(response.razorpay_payment_id || "");
          void verifyPayment(details);
        },
        modal: { confirm_close: true, ondismiss: () => {
          if (!mounted.current || callbackReceived) return;
          busyRef.current = false;
          setFlow(failed ? "failed" : "cancelled");
        } },
      });
      checkout.on("payment.failed", (response) => {
        if (callbackReceived || !mounted.current) return;
        failed = true;
        if (response.error?.metadata?.payment_id) setPaymentReference(response.error.metadata.payment_id);
        checkout.close();
        busyRef.current = false;
        setFlow("failed");
      });
      setFlow("checkout");
      checkout.open();
    } catch {
      busyRef.current = false;
      if (mounted.current) setFlow("failed");
    }
  }

  const statusMessage = flow === "preparing" ? "Preparing secure checkout…" : flow === "checkout" ? "Complete your payment in the Razorpay window." : flow === "verifying" ? "Verifying your payment securely…" : flow === "cancelled" ? "Checkout was closed. No payment has been confirmed." : flow === "failed" ? "Payment could not be completed. If your account was debited, contact the foundation before trying again." : flow === "pending" ? "Your payment is awaiting confirmation. Do not pay again; check its status or contact the foundation." : flow === "unconfirmed" ? "We could not verify your payment yet. Do not pay again; check its status or contact the foundation." : "";

  return (
    <div className="donation-form">
      <div className="form-section">
        <div className="form-section__heading"><span>1</span><div><h2>{t("Choose your contribution")}</h2><p>{t("Every amount can help strengthen a responsible initiative.")}</p></div></div>
        <div className="amount-grid" role="group" aria-label={t("Donation amount")}>
          {amounts.map((preset) => <button type="button" key={preset} disabled={locked} className={selectedAmount === preset ? "is-selected" : ""} aria-pressed={selectedAmount === preset} onClick={() => setSelectedAmount(preset)}>₹{preset.toLocaleString("en-IN")}</button>)}
          <button type="button" disabled={locked} className={selectedAmount === "custom" ? "is-selected" : ""} aria-pressed={selectedAmount === "custom"} onClick={() => setSelectedAmount("custom")}>{t("Custom amount")}</button>
        </div>
        {selectedAmount === "custom" ? <label className="field custom-amount"><span>{t("Custom amount (₹)")} <b>*</b></span><input type="number" inputMode="numeric" disabled={locked} min="100" max="500000" step="1" value={customAmount} onChange={(event) => setCustomAmount(event.target.value)} required placeholder={t("Enter an amount")} /></label> : null}
        <label className="field donation-cause"><span>{t("Choose a cause")}</span><select name="donation-cause" value={cause} disabled={locked} onChange={(event) => setCause(event.target.value)}>{causeOptions.map((option) => <option key={option} value={option}>{t(option)}</option>)}</select></label>
      </div>

      <div className="form-section">
        <div className="form-section__heading"><span>2</span><div><h2>{t("Complete secure checkout")}</h2><p>{t("Enter your donor and payment details in Razorpay's secure checkout.")}</p></div></div>
        {availability === "checking" ? <p className="payment-widget-status" role="status">{t("Checking payment availability…")}</p> : null}
        {availability === "missing" || availability === "unconfigured" || availability === "unavailable" ? <div className="static-donation-fallback"><div className="form-feedback form-feedback--info" role="status">{t(availability === "unavailable" ? "Online payment is temporarily unavailable. Please try again or use UPI/bank transfer." : availability === "missing" ? "Online payment is not available yet. You can donate using the UPI QR code or bank details above." : "Razorpay checkout is being configured. You can donate using the UPI QR code or bank details above.")}</div>{configEndpoint ? <p><button className="button button--gold" type="button" onClick={() => setAvailabilityAttempt((attempt) => attempt + 1)}>{t("Try again")}</button></p> : null}<a className="button button--green button--large" href="#direct-donation">{t("View UPI & bank details")}</a></div> : null}
        {configured && selectedAmount === "custom" && !amountIsValid ? <div className="form-feedback form-feedback--error" role="status">{t("Enter a whole amount between ₹100 and ₹5,00,000 to continue.")}</div> : null}
        {statusMessage ? <div className={`form-feedback form-feedback--${flow === "failed" || flow === "unconfirmed" ? "error" : "info"}`} role="status">{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : null}{t(statusMessage)}</div> : null}
        {flow === "success" ? <div className="form-feedback form-feedback--success payment-confirmation" role="status"><CheckCircle2 aria-hidden="true" /><div><strong>{t("Payment confirmed. Thank you for your support.")}</strong><p>₹{(verifiedAmount / 100).toLocaleString("en-IN")}</p></div></div> : null}
        {paymentReference ? <p className="payment-reference">{t("Payment reference:")} <strong>{paymentReference}</strong></p> : null}
        {configured && !awaitingConfirmation && flow !== "success" ? <button className="button button--gold button--large donation-checkout" type="button" disabled={busy || !amountIsValid} onClick={() => void startCheckout()}>{busy ? <LoaderCircle className="spin" aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}{t(busy ? "Please wait…" : "Donate securely")}</button> : null}
        {awaitingConfirmation ? <button className="button button--green" type="button" onClick={() => { if (!busyRef.current && verification.current) void verifyPayment(verification.current); }}>{t("Check payment status")}</button> : null}
        {awaitingConfirmation || flow === "success" ? <p><Link className="text-link" href="/contact?interest=donation">{t("Contact the foundation for an acknowledgement")}</Link></p> : null}
      </div>

      <p className="policy-consent">{t("By continuing, you agree to the")}&nbsp;<Link href="/donation-policy" target="_blank">{t("Donation Policy")}</Link>,&nbsp;<Link href="/terms" target="_blank">{t("Terms")}</Link>&nbsp;{t("and")}&nbsp;<Link href="/privacy-policy" target="_blank">{t("Privacy Policy")}</Link>.</p>
      <div className="payment-assurance"><span><ShieldCheck />{t("Server-verified payments")}</span><span><CreditCard />{t("Payment details handled by Razorpay")}</span><span><LockKeyhole />{t("No banking credentials stored here")}</span></div>
    </div>
  );
}

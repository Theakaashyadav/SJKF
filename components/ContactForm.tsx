"use client";

import { useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";

function initialSubject(interest: string | null) {
  if (interest === "volunteer") return "Volunteer with us";
  if (interest === "partnership") return "Partnership / CSR enquiry";
  if (interest === "donation") return "Donation assistance";
  return "General enquiry";
}

export function ContactForm() {
  const searchParams = useSearchParams();
  const defaultSubject = useMemo(() => initialSubject(searchParams.get("interest")), [searchParams]);
  const [subject, setSubject] = useState(defaultSubject);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const startedAt = useRef(Date.now());
  const contactEndpoint = process.env.NEXT_PUBLIC_CONTACT_FORM_ENDPOINT;

  useEffect(() => setSubject(defaultSubject), [defaultSubject]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    if (!contactEndpoint || !contactEndpoint.startsWith("https://")) {
      setFeedback({ type: "error", message: "Online messages are being configured. Please use the published contact details once available." });
      return;
    }
    setSending(true);
    setFeedback(null);
    const data = new FormData(form);
    try {
      if (String(data.get("_gotcha") || "").trim() || Date.now() - startedAt.current < 1500) throw new Error("Submission could not be verified.");
      const response = await fetch(contactEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: data,
      });
      const result = await response.json().catch(() => ({})) as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error || result.message || "Your message could not be sent.");
      setFeedback({ type: "success", message: "Thank you. Your message has been sent to the foundation." });
      form.reset();
      startedAt.current = Date.now();
    } catch (error) {
      setFeedback({ type: "error", message: error instanceof Error ? error.message : "Your message could not be sent. Please try again." });
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <form className="contact-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <label className="field"><span>Name <b>*</b></span><input name="name" type="text" autoComplete="name" minLength={2} maxLength={100} required /></label>
          <label className="field"><span>Email <b>*</b></span><input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
          <label className="field"><span>Phone <b>*</b></span><input name="phone" type="tel" autoComplete="tel" pattern="(?:\+?91[ -]?)?[6-9][0-9]{9}" title="Enter a valid 10-digit Indian mobile number" required /></label>
          <label className="field"><span>Subject <b>*</b></span><select name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required><option>General enquiry</option><option>Volunteer with us</option><option>Partnership / CSR enquiry</option><option>Support a cause</option><option>Donation assistance</option><option>Media enquiry</option></select></label>
          <label className="field field--wide"><span>Message <b>*</b></span><textarea name="message" rows={6} minLength={15} maxLength={2000} placeholder="Tell us how we can help or how you would like to get involved." required /></label>
          <label className="honeypot" aria-hidden="true">Website<input name="_gotcha" type="text" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <p className="spam-note">Protected by required-field validation, a hidden bot-detection field and the configured form provider’s spam controls.</p>
        {feedback ? <div className={`form-feedback form-feedback--${feedback.type}`} role="status">{feedback.type === "success" ? <CheckCircle2 /> : null}{feedback.message}</div> : null}
        <button className="button button--green button--large" type="submit" disabled={sending}>{sending ? <><LoaderCircle className="spin" />Sending</> : <><Send />Send message</>}</button>
      </form>
    </>
  );
}

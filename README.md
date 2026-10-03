# Swabhiman Jan Evam Pashu Kalyan Foundation website

Production-oriented, static-first NGO website built with Next.js, React, TypeScript and Tailwind CSS. Informational routes are prerendered; only payment operations use first-party server routes.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Production environment

Set these variables in the Vercel project before enabling live payments:

- `NEXT_PUBLIC_SITE_URL`: canonical production origin, for example `https://example.org`
- `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_CONTACT_PHONE`: verified public contact details
- `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT`: HTTPS endpoint from a secure static-form provider such as Formspree or Basin
- `RAZORPAY_KEY_ID`: Razorpay public key ID, returned to checkout only with a server-created order
- `RAZORPAY_KEY_SECRET`: server-only Razorpay secret
- `RAZORPAY_WEBHOOK_SECRET`: separate webhook signing secret
- `PAYMENT_RECEIPT_SECRET`: long random value used to encrypt short-lived receipt links
- `DONATION_PAN_ENABLED` and `NEXT_PUBLIC_DONATION_PAN_ENABLED`: keep both `false`; enable together only after a verified legal or receipt requirement
- `KV_REST_API_URL` and `KV_REST_API_TOKEN`: Vercel KV / Upstash Redis REST credentials for the payment-only ledger, distributed rate limits, webhook-event idempotency and receipt outbox
- `PAYMENT_RECORD_TTL_SECONDS`: payment-ledger retention period; review this with the foundation’s accounting/legal adviser before launch
- `RESEND_API_KEY`, `RECEIPT_FROM_EMAIL`: verified donation-receipt email delivery configuration

Never prefix a secret with `NEXT_PUBLIC_`.

## Razorpay configuration

1. Add the production key ID and secret in Vercel.
2. Add a Razorpay webhook pointing to `https://YOUR-DOMAIN/api/razorpay/webhook`.
3. Subscribe to the payment/order events required by the organization’s reconciliation process.
4. Use a dedicated webhook secret and set the same value as `RAZORPAY_WEBHOOK_SECRET`.
5. Complete gateway KYC, live-mode approval and an end-to-end low-value payment test before publishing the Donate CTA to the public.

Orders are created server-side. Checkout is hosted by Razorpay. The return signature, order and payment are checked server-side before the success acknowledgement is issued. Full card data, CVV, OTP, PIN and banking passwords are never stored by this application.

The payment store is mandatory: checkout remains unavailable until it is configured. It binds each browser callback to the server-created order, records captured payments, deduplicates Razorpay event IDs, preserves receipt-delivery state beyond provider retry windows and applies distributed order/verification rate limits.

## Contact delivery

To preserve the payment-only serverless boundary, contact messages submit directly from the validated static form to the configured HTTPS form provider. The form includes required-field validation, mobile/email patterns and a provider-compatible honeypot. Before launch, approve a provider that enforces its own server-side validation, rate limiting or CAPTCHA, destination verification, spam filtering and appropriate CORS. Until an endpoint is configured, the form gives a clear unavailable message instead of pretending submission succeeded.

## Routes

- `/`
- `/about`
- `/our-work`
- `/gallery`
- `/donate`
- `/contact`
- `/payment-success`
- `/payment-failed`
- `/privacy-policy`
- `/terms`
- `/donation-policy`
- `/refund-policy`

Next.js App Router provides extension-free clean URLs. `vercel.json` also enables clean URLs and security headers.

## Content and image integrity

Organization facts were cross-checked against the supplied MCA and DARPAN records. The draft ISO document is not used as a public certification claim. The site makes no 80G claim.

Development photographs are licensed Pexels stock images. The gallery labels them as placeholders and never presents them as completed foundation work. Provenance is recorded in `public/images/README.md`; replace them with consented, verified project media as it becomes available.

## Verification

```bash
npm run typecheck
npm run build
```

The production build output identifies which routes are static and which are server-rendered/API routes.

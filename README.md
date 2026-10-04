# Swabhiman Jan Evam Pashu Kalyan Foundation website

Production-oriented static NGO website built with Next.js, React, TypeScript and Tailwind CSS. Every route is exported to HTML/CSS/JavaScript and can be hosted without a Node.js server.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

To preview the exact exported files after a production build, run `npm run build` and then `npm run preview`.

## Render deployment

The repository includes `render.yaml` for a Render Blueprint. It creates a Render Static Site, runs `npm ci && npm run build` and publishes the generated `out` directory.

Use [Deploy to Render](https://render.com/deploy?repo=https://github.com/Theakaashyadav/SJKF), create a Blueprint from this repository, or create a Static Site manually with these values:

- Root Directory: leave blank
- Build Command: `npm ci && npm run build`
- Publish Directory: `out`

Do not add a start command or `PORT`. Add the public settings from `.env.example` in the site's Environment page before deploying. All `NEXT_PUBLIC_` values are embedded at build time, so redeploy after changing one.

## Production environment

Set these public build-time variables in the hosting project:

- `NEXT_PUBLIC_SITE_URL`: canonical custom-domain origin, for example `https://example.org`; when omitted on Render, the build uses `RENDER_EXTERNAL_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_CONTACT_PHONE`: verified public contact details
- `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT`: HTTPS endpoint from a secure static-form provider such as Formspree or Basin
- `NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID`: public `pl_...` ID of a live Razorpay Donations Payment Button

This is a static site: never add API secrets, webhook secrets, private tokens or banking credentials to its environment. Every `NEXT_PUBLIC_` value is visible to visitors.

## Razorpay configuration

1. Complete Razorpay account activation and KYC.
2. In the Razorpay dashboard, create a live **Donations Payment Button**.
3. Configure INR, an editable amount field labelled **Donation Amount** from ₹100 to ₹5,00,000, presets of ₹500/₹1,000/₹2,500/₹5,000/₹10,000, and required name, email and mobile fields. The exact label lets the website prefill `data-prefill.amount.donation_amount`.
4. Add a required cause field in Razorpay with the same causes displayed on this website. Add address, message or PAN only when there is a verified operational or legal need.
5. Enable the provider's payment receipt and post-payment message. If using a redirect, point it to `https://YOUR-DOMAIN/payment-success/`.
6. Copy only the public Payment Button ID (`pl_...`) into `NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID`, redeploy, and complete an end-to-end low-value live test.

Payment entry, status and receipts are handled by Razorpay's hosted interface. The static site does not independently verify a transaction. Reconcile every contribution using Razorpay's transaction records before treating it as confirmed. Full card data, CVV, OTP, PIN and banking passwords are never stored by this application.

## Contact delivery

Contact messages submit directly from the validated static form to the configured HTTPS form provider. The form includes required-field validation, mobile/email patterns and a provider-compatible honeypot. Before launch, approve a provider that enforces its own server-side validation, rate limiting or CAPTCHA, destination verification, spam filtering and appropriate CORS. Until an endpoint is configured, the form gives a clear unavailable message instead of pretending submission succeeded.

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

Next.js App Router generates trailing-slash static routes. Render serves the exported pages and applies the security headers declared in `render.yaml`.

## Content and image integrity

Organization facts were cross-checked against the supplied MCA and DARPAN records. The draft ISO document is not used as a public certification claim. The site makes no 80G claim.

Development photographs are licensed Pexels stock images. The gallery labels them as placeholders and never presents them as completed foundation work. Provenance is recorded in `public/images/README.md`; replace them with consented, verified project media as it becomes available.

## Verification

```bash
npm run typecheck
npm run build
```

The production build creates the deployable static site in `out`, copies the complete Next.js static asset tree, and checks that every exported page's CSS, JavaScript and fonts exist before deployment. Missing assets fail the build instead of publishing an unstyled website.

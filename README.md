# Swabhiman Jan Evam Pashu Kalyan Foundation website

NGO website built with Next.js, React, TypeScript and Tailwind CSS. The public pages are pre-rendered where possible; a Node.js server creates Razorpay orders and verifies payments using the foundation's API Key ID and Key Secret.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Add your Razorpay credentials to `.env.local` as described below, then restart the development server. To preview a production build, run `npm run build` and then `npm start` (or `npm run preview`).

## Website languages

The header's language button switches between English and Hindi. First visits use English; the browser remembers a visitor's choice for subsequent pages and visits. Navigation, page content and form controls translate together. Original PDFs, logos, bank account details and Razorpay's hosted interface retain their supplied content.

Hindi copy is maintained in `lib/translations-common.ts`, `lib/translations-pages.ts` and `lib/translations-forms.ts`. Use the `T` component or the `useLanguage().t` helper for new visible copy. After building and starting the preview, run `npm run audit:language` to check language switching, persistence, routes and mobile layouts. The browser audit uses Microsoft Edge by default; `AUDIT_BROWSER_PATH` and `AUDIT_BASE_URL` can override the browser executable and preview URL.

## Render deployment

The repository includes `render.yaml` for a Render Blueprint. It defines a Node.js Web Service named `sjkf-web`, using the free plan, with `npm ci && npm run build` and `npm start`.

Use [Deploy to Render](https://render.com/deploy?repo=https://github.com/Theakaashyadav/SJKF), create a Blueprint from this repository, or create a new **Web Service** linked to the GitHub repository with these values:

- Repository: `Theakaashyadav/SJKF`
- Branch: `main`
- Root Directory: leave blank
- Language / Runtime: `Node`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Environment: add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

An existing Render Static Site cannot be converted to a Node runtime. Create the new Web Service, verify it, then move any custom domain to it when ready. The new service name avoids applying Node settings to the existing static service. A GitHub push alone does not perform that migration. Render's deployment options and runtime restriction are documented in [Next.js deployment](https://render.com/docs/deploy-nextjs-app) and the [Blueprint reference](https://render.com/docs/blueprint-spec).

Render supplies the server's `PORT`. Add the remaining settings from `.env.example` in the service's Environment page. Redeploy after changing environment settings. Every `NEXT_PUBLIC_` value is embedded at build time and visible to visitors; the two Razorpay variables have no public prefix and remain on the server.

## Production environment

Set these server-only variables in the hosting project:

- `RAZORPAY_KEY_ID`: your Razorpay API Key ID (`rzp_test_...` for testing or `rzp_live_...` for live payments)
- `RAZORPAY_KEY_SECRET`: the matching API Key Secret from the same Razorpay account and mode

The app reads these values at runtime. `/api/payments/config/` exposes whether checkout is configured and the public Key ID; it never returns the Key Secret. Keep real credentials in the ignored `.env.local` file or the hosting service's private Environment settings, never in GitHub or a `NEXT_PUBLIC_` variable.

Public build-time variables:

- `NEXT_PUBLIC_SITE_URL`: canonical custom-domain origin, for example `https://example.org`; when omitted on Render, the build uses `RENDER_EXTERNAL_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_CONTACT_PHONE`: optional overrides for the published contact details, `swabhimanfoundation2026@gmail.com` and `+91 9528547505`
- `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT`: HTTPS endpoint from a secure static-form provider such as Formspree or Basin

## Razorpay configuration

The donation form uses **Razorpay Standard Checkout** with API credentials. It does not require a Payment Button ID or Payment Button embed code.

1. Start with the matching **Test Mode** API Key ID and Key Secret from your Razorpay dashboard.
2. Put the credentials in `.env.local` for local use, or in the Node Web Service's Environment settings for a hosted deployment.
3. Configure automatic payment capture in the Razorpay dashboard. This application confirms a contribution only after Razorpay reports a captured payment and paid order. See [payment capture settings](https://razorpay.com/docs/payments/payments/capture-settings).
4. Use Razorpay's Test Mode to check successful, failed and cancelled checkout flows without real charges. Verify the result in the Razorpay dashboard.
5. After completing account activation and the test flow, replace both values with the matching Live Mode key pair and redeploy. See [Razorpay Standard Checkout integration and testing](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps).

### Where to paste your Key ID and Key Secret

For local development, edit `.env.local` in this `website` directory. If it does not exist, copy `.env.example` first (PowerShell: `Copy-Item .env.example .env.local`). Set:

```dotenv
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_MATCHING_KEY_SECRET
```

Restart `npm run dev` after editing `.env.local`. Remove the old `NEXT_PUBLIC_RAZORPAY_PAYMENT_BUTTON_ID` setting if present; it is no longer used. `.env.example` contains empty credential fields for documentation only.

For Render, open **Dashboard → your new Node Web Service → Environment → Add Environment Variable**. Add `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` separately, then save and redeploy. Do not add the Secret to a Static Site, browser code, `.env.example`, or GitHub.

### Payment flow and confirmation

The donor selects a cause and a whole-rupee amount from ₹100 to ₹5,00,000. `/api/payments/order/` validates the request, converts the amount to paise and creates an INR order through Razorpay. It returns the public checkout details and an expiring HMAC-signed order token. The Secret remains on the server.

After checkout, `/api/payments/verify/` validates the order token and Razorpay payment signature, then fetches the payment and order from Razorpay to check the order, amount, INR currency and capture status. Only a matching captured payment with a paid order produces a verified confirmation. An authorized payment remains pending; a failed verification does not produce a success message.

This version has no payment database, webhook receiver or automatic acknowledgement email. Razorpay's transaction records remain the source for reconciliation, including later status changes or payments completed after the browser closes. Donors can share their payment reference through the published contact details to request an acknowledgement. Full card data, CVV, OTP, PIN and banking passwords are not stored by this application.

## Contact delivery

Contact messages submit directly from the validated static form to the configured HTTPS form provider. The form includes required-field validation, mobile/email patterns and a provider-compatible honeypot. Before launch, approve a provider that enforces its own server-side validation, rate limiting or CAPTCHA, destination verification, spam filtering and appropriate CORS. Until an endpoint is configured, the form gives a clear unavailable message instead of pretending submission succeeded.

## Routes

- `/`
- `/about`
- `/our-work`
- `/gallery`
- `/documents`
- `/donate`
- `/contact`
- `/payment-success`
- `/payment-failed`
- `/privacy-policy`
- `/terms`
- `/donation-policy`
- `/refund-policy`

Next.js App Router serves trailing-slash page routes and the same-origin `/api/payments/config/`, `/api/payments/order/` and `/api/payments/verify/` endpoints. Deploy the `.next` production build with `npm start`; the old `out` static export cannot run these payment APIs.

## Content and image integrity

Organization facts were cross-checked against the supplied MCA and DARPAN records. The supplied 149Q ISO 9001 PDF is available in the document library; the earlier draft ISO document is not published. The site makes no 80G claim.

The Documents page previews the ISO 9001 document, registration and governance PDFs stored in `public/documents/`. Its titles, descriptions and file sizes are listed in `lib/documents.ts`. To add or replace a document, update the PDF and its corresponding entry, then rebuild the site. Drafts, tax cards and individual DIN letters are not included in the public library.

The homepage and gallery share four photographs supplied in `Images/Gallery`; duplicate copies are displayed only once. The homepage shows a compact photo grid with the same enlarged photo viewer as the gallery page. Gallery captions describe the visible content without inferring event dates or locations. Other illustrative photographs are licensed Pexels stock images. Provenance is recorded in `public/images/README.md`.

## Verification

```bash
npm run typecheck
npm run test:payments
npm run build
npm start
```

With the production server running, use a second terminal:

```bash
npm run audit:language
npm run audit:payment
```

The payment unit tests mock Razorpay API responses. The payment browser audit mocks the payment APIs and checkout script; it checks the app's handling of success, pending, cancelled, failed and invalid verification responses without creating real charges. These automated checks do not replace a complete Test Mode checkout using the account's credentials.

# Swabhiman Jan Evam Pashu Kalyan Foundation website

A static NGO website built with Next.js, React, TypeScript and Tailwind CSS. Its production build exports HTML, CSS, JavaScript and assets to `out`, so the existing Render Static Site continues to serve the website. Donors pay through Razorpay Standard Checkout on the donation page.

Razorpay API Key ID and Key Secret are used by the separate `payment-api/` service. A static frontend can use API credentials only through a backend: the Secret cannot safely be used in browser-only code. The website itself has no Next.js payment API routes and needs no Node website server, Payment Page URL or Payment Button.

## Local development

Start the payment API in one terminal:

```bash
cd payment-api
npm ci
cp .env.example .env
npm start
```

In the ignored `payment-api/.env` file, set:

```dotenv
RAZORPAY_KEY_ID=rzp_test_YOUR_KEY_ID
RAZORPAY_KEY_SECRET=YOUR_MATCHING_KEY_SECRET
PAYMENT_ALLOWED_ORIGINS=http://127.0.0.1:3000,http://localhost:3000
```

The API listens on port 4000 locally. It uses Node.js 22.23.4, native TypeScript stripping and built-in modules, with no third-party runtime dependencies.

In a second terminal at this repository's root:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set the public backend origin in the root `.env.local`:

```dotenv
NEXT_PUBLIC_RAZORPAY_API_URL=http://127.0.0.1:4000
```

Open `http://localhost:3000`. Restart the API after changing `payment-api/.env`; restart development or rebuild the static website after changing its public API URL. To preview the exact exported files, run `npm run build` and then `npm run preview` (or `npm start`), while keeping the separate API running.

## Website languages

The header switches between English and Hindi. First visits use English; the browser remembers the visitor's choice across pages and visits. Navigation, content and form controls translate together. Original PDFs, logos and bank account details retain their supplied content.

Hindi copy is maintained in `lib/translations-common.ts`, `lib/translations-pages.ts` and `lib/translations-forms.ts`. Use `T` or `useLanguage().t` for new visible copy. After building and starting the preview, run `npm run audit:language`. Browser audits use Microsoft Edge by default; `AUDIT_BROWSER_PATH` and `AUDIT_BASE_URL` override the browser executable and preview URL.

## Render deployment

Deploy two services from `Theakaashyadav/SJKF`, branch `main`. The repository's `render.yaml` Blueprint defines both services; [Deploy to Render](https://render.com/deploy?repo=https://github.com/Theakaashyadav/SJKF) can read that configuration.

The Blueprint connects the Static Site's `NEXT_PUBLIC_RAZORPAY_API_URL` to the payment service's public Render URL automatically and approves the foundation's custom domain and `sjkf.onrender.com` origin for CORS. It prompts only for the API service's private Razorpay credentials. Sync the Blueprint to apply these environment settings; pushing a commit to a manually created service does not apply `render.yaml`. Render documents [service environment references](https://render.com/docs/blueprint-spec#referencing-service-properties).

### Existing website: Static Site

Keep the website as the existing Render **Static Site**:

- Service name: `sjkf`
- Root Directory: leave blank
- Build Command: `npm ci && npm run build`
- Publish Directory: `out`
- Environment: `NEXT_PUBLIC_RAZORPAY_API_URL=https://YOUR-PAYMENT-API.onrender.com`

This static build creates `out`, resolving the earlier `Publish directory out does not exist!` error. The website needs no Start Command or `PORT` setting. Do not publish `.next` as a Static Site. Render's [Next.js deployment guide](https://render.com/docs/deploy-nextjs-app) describes static-export hosting.

### Separate payment API: Node Web Service

Create a separate **Web Service** for the payment API; keep the existing website's service type unchanged:

- Root Directory: `payment-api`
- Runtime: `Node`
- Node version: `22.23.4`
- Build Command: `npm ci`
- Start Command: `npm start`
- Plan: `free`
- Private Environment: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `PAYMENT_ALLOWED_ORIGINS`

Set `PAYMENT_ALLOWED_ORIGINS` to the exact public origins of the static website, separated by commas, for example `https://YOUR-STATIC-SITE.onrender.com,https://YOUR-CUSTOM-DOMAIN`. Do not include URL paths or use `*`. Add both the custom domain and Render origin if donors use both. Render supplies the API service's `PORT`.

Once the API is deployed, copy its actual origin into `NEXT_PUBLIC_RAZORPAY_API_URL` in the **Static Site's Environment**, then rebuild/redeploy the static site. Public website settings are embedded at build time. An API URL and configured backend are required before online Razorpay checkout becomes available; UPI and bank details remain available during setup.

The API Key ID and Secret belong only in the payment API service's private Environment. Remove old payment secrets and hosted-page/button settings from the Static Site environment. The root `.env.local` is for public website configuration; it does not configure the separately hosted API.

### Checkout stays unavailable after saving credentials

The deployed website must contain a public payment API URL before it can check the credentials. On a manually configured Static Site, add `NEXT_PUBLIC_RAZORPAY_API_URL` with the actual payment Web Service URL, then choose **Save, rebuild, and deploy**. Saving credentials on the Static Site alone cannot configure the separate API. In the payment Web Service, use the exact names `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, and set `PAYMENT_ALLOWED_ORIGINS` to `https://www.swabhimankalyanfoundation.org` (plus other origins visitors use). Save and deploy the API's settings.

Verify the API's `/health` endpoint returns `200` and `/api/payments/config/` reports `configured: true`; the configuration response contains only the public Key ID. The website must be able to fetch that endpoint with its origin accepted by CORS. Use the donation form's availability retry if a sleeping API is still starting. No payment order is created by an availability check. Environment save/rebuild behavior is described in [Render's environment documentation](https://render.com/docs/configure-environment-variables).

## Public build settings

- `NEXT_PUBLIC_RAZORPAY_API_URL`: actual payment API origin, with no `/api/payments` suffix; use HTTPS for a deployed site
- `NEXT_PUBLIC_SITE_URL`: canonical custom-domain origin; when empty on Render, the build uses `RENDER_EXTERNAL_URL`
- `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_CONTACT_PHONE`: optional overrides for `swabhimanfoundation2026@gmail.com` and `+91 9528547505`
- `NEXT_PUBLIC_CONTACT_FORM_ENDPOINT`: HTTPS endpoint from a static-form provider such as Formspree or Basin

Every `NEXT_PUBLIC_` value is visible to visitors. Never put the Key Secret in these variables, JavaScript, the Static Site's build environment or GitHub. Keep real API credentials in ignored `payment-api/.env` for local development or the backend service's private Environment for production.

## Razorpay API credentials and checkout

Use the matching **Test Mode** Key ID and Secret from the Razorpay dashboard first. Put the pair in `payment-api/.env` locally, or the API Web Service's private Environment when hosted. No hosted Payment Page or Payment Button ID is needed.

Enable automatic payment capture in the Razorpay dashboard. Before accepting real donations, test successful, failed and cancelled checkout with the account's Test Mode credentials and inspect the results in Razorpay. Replace both backend credentials with the matching Live Mode pair after account activation and testing. See [Razorpay Standard Checkout](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps) and [capture settings](https://razorpay.com/docs/payments/payments/capture-settings).

### Payment flow and confirmation

The static donation page requests runtime configuration from the separate API. The donor selects a cause and a whole-rupee amount from ₹100 to ₹5,00,000, then opens Razorpay Checkout. The backend validates the request, converts the amount to paise and creates an INR order. It returns the public Key ID, checkout order and an expiring signed order token; it never returns the Secret.

After checkout, the backend verifies the token and Razorpay payment signature, fetches the provider's payment/order records, and checks matching order, amount, currency and capture status. The donation form displays confirmation only for a matching captured payment with a paid order. Authorized or pending payments remain unconfirmed; a failed verification cannot produce a success message.

The external API retains these paths:

- `GET /api/payments/config/`
- `POST /api/payments/order/`
- `POST /api/payments/verify/`

`PAYMENT_ALLOWED_ORIGINS` controls which static website origins can call it. The API has no payment database, webhook receiver or automatic receipt email. Razorpay's records remain the source for reconciliation, including later status changes and payments completed after the browser closes. Keep the transaction reference and contact the foundation to request an acknowledgement. Direct UPI and bank transfers require manual reconciliation. Visiting `/payment-success/` or `/payment-failed/` does not verify a transaction.

## Contact delivery

Contact messages submit directly from the validated form to the configured HTTPS form provider. The form includes required-field validation, mobile/email patterns and a provider-compatible honeypot. Use a provider with server-side validation and spam protection. Until an endpoint is configured, the form reports that delivery is unavailable instead of showing a false success.

## Static website routes

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

All website routes are exported with trailing slashes. Render serves the static files and security headers from `render.yaml`. Payment API paths belong to the separate backend origin and are not part of the website's `out` directory.

## Content and image integrity

Organization facts were cross-checked against the supplied MCA and DARPAN records. The supplied 149Q ISO 9001 PDF is available in the document library; the earlier draft ISO document is not published. The site makes no 80G claim.

The Documents page previews the ISO 9001 document, registration and governance PDFs in `public/documents/`. Titles, descriptions and file sizes are in `lib/documents.ts`. Update the PDF and its corresponding entry, then rebuild. Drafts, tax cards and individual DIN letters are excluded from the public library.

The homepage and gallery share four photographs supplied in `Images/Gallery`; duplicates appear only once. Both offer an enlarged photo viewer. Captions describe visible content without inferring event dates or locations. Other illustrative photographs are licensed Pexels stock images. Provenance is recorded in `public/images/README.md`.

## Verification

```bash
npm run typecheck
npm run test:payments
npm run build
npm run preview
```

With the static preview running, use a second terminal:

```bash
npm run audit:language
npm run audit:payment
```

The build copies the full Next.js static asset tree and verifies the exported pages' CSS, JavaScript, fonts, images and PDFs. Payment unit tests use mocked provider responses. Browser payment checks mock the external API and Razorpay script to exercise success, pending, cancelled and failed flows without charges. These checks do not replace a complete Test Mode payment using the account's credentials and deployed API.
